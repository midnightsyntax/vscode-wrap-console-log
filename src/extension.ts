'use strict';

import * as vscode from 'vscode';
import { window, QuickPickItem, workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let currentEditor:vscode.TextEditor;
let currentContext:vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    currentContext = context;
    currentEditor = vscode.window.activeTextEditor;
    var props = JSON.parse(fs.readFileSync(path.join(currentContext.extensionPath, 'package.json'), 'utf8')).contributes.configuration.properties;
    Object.keys(props).forEach((prop, i) => {
        let pName = prop.replace('wrap-console-log.','');
        let pObj = props[prop];
        let settingValue = getSetting(pName);
        if (pObj) {
            if (pObj.hasOwnProperty("enum")) {
                console.log(`Checking enum config '${pName}'`);
                let valueValid = pObj.enum.some(val => val == settingValue);
                if (!valueValid) {
                    vscode.workspace.getConfiguration("wrap-console-log").update(pName, undefined);
                    console.log(`Invalid setting value! '${pName}' has been set to default value '${pObj.default}'`);
                }
            }
        }
    });
    vscode.window.onDidChangeActiveTextEditor(editor => currentEditor = editor);
    
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('console.log.wrap', (editor, edit) => handle(Wrap.Inline)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.string', (editor, edit) => handle(Wrap.Inline, false, false, FormatAs.String)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.string.up', (editor, edit) => handle(Wrap.Up, false, false, FormatAs.String)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.string.down', (editor, edit) => handle(Wrap.Down, false, false, FormatAs.String)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.prefix', (editor, edit) => handle(Wrap.Inline, true)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.input', (editor, edit) => handle(Wrap.Inline, true, true)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.up', (editor, edit) => handle(Wrap.Up)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.up.prefix', (editor, edit) => handle(Wrap.Up, true)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.up.input', (editor, edit) => handle(Wrap.Up, true, true)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.down', (editor, edit) => handle(Wrap.Down)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.down.prefix', (editor, edit) => handle(Wrap.Down, true)),
        vscode.commands.registerTextEditorCommand('console.log.wrap.down.input', (editor, edit) => handle(Wrap.Down, true, true))
    );
}

function handle(target: Wrap, prefix?: boolean, input?: boolean, formatAs?: FormatAs) {

    new Promise((resolve, reject) => {
        let sel = currentEditor.selection;
        let len = sel.end.character - sel.start.character;
    
        let ran = len == 0 ? currentEditor.document.getWordRangeAtPosition(sel.anchor) : 
            new vscode.Range(sel.start, sel.end);
    
        if (ran == undefined) {
            reject('NO_WORD');
        }
        else {

            let doc = currentEditor.document;
            let lineNumber = ran.start.line
            let idx = doc.lineAt(lineNumber).firstNonWhitespaceCharacterIndex
            let wrapData = { 
                txt: undefined,
                item: doc.getText(ran),
                doc: doc,
                ran: ran,
                idx: idx,
                ind: doc.lineAt(lineNumber).text.substring(0, idx),
                line: lineNumber,
                sel: sel,
                lastLine: doc.lineCount-1 == lineNumber
            } ;

            prefix = prefix || getSetting("alwaysUsePrefix") ? true : false
            const prefixString = getSetting("format.wrap.prefixStringLanguages")[doc.languageId] || getSetting('format.wrap.prefixString');

            if (prefix) {
                if (getSetting("alwaysInputBoxOnPrefix") == true || input) {
                    vscode.window.showInputBox({placeHolder: 'Prefix string', value: '', prompt: 'Use text from input box as prefix'}).then((val) => {
                        if (val != undefined) {
                            wrapData.txt = getSetting('format.wrap.prefixFunctionName').concat("('", val.trim(), "',", wrapData.item, ")");
                            resolve(wrapData);
                        } else reject('INPUT_CANCEL');
                    })
                } else {
                    wrapData.txt = prefixString.replace('$func',
                                    getSetting('format.wrap.prefixFunctionName')).replace(/[$]var/g,
                                    wrapData.item);
                    resolve(wrapData);
                }
            } else {
                if (formatAs != undefined) {
                    switch (formatAs) {
                        case FormatAs.String:
                                wrapData.txt = getSetting('format.wrap.logFunctionName').concat("('", wrapData.item, "')");
                            break;
                    }
                } else {
                    wrapData.txt = getSetting('format.wrap.logString')
                        .replace('$func', getSetting('format.wrap.logFunctionName')).replace(/[$]var/g, wrapData.item)
                }
                resolve(wrapData);
            }
        };
    }).then((wrap:WrapData) => {

        // "Insert and push",
        // "Replace empty"
        const onEmptyAction = getSetting("configuration.emptyLineAction");

        // "Current position",
        // "Beginning of wrap",
        // "End of wrap",
        // "Beginning of Line",
        // "End of line"

        // "Current line",
        // "Target line"
        const setCursorLine = getSetting("configuration.moveToLine");
        
        function SetCursor(line: number, character?: number) {

            let tpos;
            switch (getSetting('configuration.moveToPosition')) {
        
                case 'Current position':
                    tpos = new vscode.Position(line, currentEditor.selection.anchor.character);
                    break;
            
                case 'End of line':
                    tpos = new vscode.Position(line, currentEditor.document.lineAt(line).range.end.character);
                    break;

                case 'Beginning of line':
                    tpos = new vscode.Position(line, currentEditor.document.lineAt(line).range.start.character);
                    break;

                case 'Beginning of wrap':
                    tpos = new vscode.Position(line, character);
                    break;

                case 'First character':
                    tpos = new vscode.Position(line, currentEditor.document.lineAt(line).firstNonWhitespaceCharacterIndex);
                    break;

                default:
                    break;
            }
            currentEditor.selection = new vscode.Selection(tpos, tpos)
        }

        function getTargetLine(go: Wrap) {
            let stop = false;
            let li = wrap.line;
            let l = 0;
            while (!stop) {
                if (go == Wrap.Down) {
                    li++;
                } else { li-- }
                if (li < wrap.doc.lineCount) {
                    if (!wrap.doc.lineAt(li).isEmptyOrWhitespace) {
                        l = li; stop = true;
                    }
                } else {
                    if (li == wrap.doc.lineCount) li--;
                    stop = true;
                }
            }
            return li;
        }

        switch (target) {

            case Wrap.Inline: {
                currentEditor.edit(function(e) {
                    e.replace(wrap.ran, wrap.txt);
                }).then(() => {
                    currentEditor.selection = new vscode.Selection(
                        new vscode.Position(wrap.ran.start.line, wrap.txt.length + wrap.ran.start.character),
                        new vscode.Position(wrap.ran.start.line, wrap.txt.length + wrap.ran.start.character)
                    )
                });
            } break;
        
            case Wrap.Up: {

                let tLine = wrap.doc.lineAt(wrap.line == 0 ? 0 : wrap.line-1);
                let tLineEmpty = tLine.text.trim() == '' ? true : false;
                var lineCorr = 0

                currentEditor.edit(function(e) {
                    if (tLineEmpty && onEmptyAction == "Replace empty") {
                        lineCorr = -1;
                        e.delete(tLine.rangeIncludingLineBreak);
                        e.insert(new vscode.Position(wrap.line, 0), wrap.ind.concat(wrap.txt, '\n'))
                    } else {
                        setCursorLine == 'Current line' ? lineCorr = 1 : lineCorr = 0
                        if (setCursorLine == 'Target line') {
                            e.insert(new vscode.Position(wrap.line-1, wrap.idx), wrap.ind.concat(wrap.txt));
                        } else {
                            e.insert(new vscode.Position(wrap.line, wrap.idx), wrap.txt.concat('\n',wrap.ind));
                        }
                    }
                }).then(() => {
                    SetCursor(wrap.line + lineCorr, wrap.ind.length);
                });
            } break;

            case Wrap.Down: {

                let nxtLine: vscode.TextLine;
                let nxtLineInd: string;
                let nxtNonEmpty: vscode.TextLine

                if (!wrap.lastLine) {
                    nxtLine = wrap.doc.lineAt(wrap.line+1);
                    nxtLineInd = nxtLine.text.substring(0, nxtLine.firstNonWhitespaceCharacterIndex);
                } else {
                    nxtLineInd = "";
                }

                wrap.ind = vscode.workspace.getConfiguration("wrap-console-log")["autoFormat"] == true ? "" : wrap.ind;
                let pos = new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character);
                
                currentEditor.edit((e) => {
                    let nxtNonEmpty;
                    if (nxtLine) {
                        nxtNonEmpty = (nxtLine.isEmptyOrWhitespace) ? wrap.doc.lineAt(getTargetLine(Wrap.Down)) : undefined;
                    }
                    if (wrap.lastLine == false && nxtLine.isEmptyOrWhitespace) {
                        function defaultAction() {
                            e.insert(new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character), "\n".concat((nxtLineInd > wrap.ind ? nxtLineInd : wrap.ind), wrap.txt));
                        };
                        if (onEmptyAction == "Insert and push") {
                            defaultAction();
                        } else if (onEmptyAction == "Replace empty") {
                            if (nxtLine && (nxtNonEmpty.firstNonWhitespaceCharacterIndex > 0)) {
                                e.replace(new vscode.Position(nxtLine.lineNumber, 0), " ".repeat(nxtNonEmpty.firstNonWhitespaceCharacterIndex).concat(wrap.txt));
                            } else {
                                e.replace(new vscode.Position(nxtLine.lineNumber, 0), wrap.ind.concat(wrap.txt));
                            }
                        } else {
                            console.log(`Invalid config setting! Using 'emptyLineAction' default value`);
                            defaultAction();
                        }
                    } else {
                        e.insert(new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character),
                        "\n".concat((nxtLineInd.length > wrap.ind.length ? nxtLineInd : wrap.ind), wrap.txt));
                    }
                }).then(() => {
                    if (nxtLine == undefined) {
                        nxtLine = wrap.doc.lineAt(wrap.line+1);
                    }
                    if (getSetting("autoFormat") == true && !wrap.lastLine) {
                        let nextLineEnd = wrap.doc.lineAt(wrap.line+2).range.end;
                        currentEditor.selection = new vscode.Selection(wrap.sel.start, nextLineEnd)
                        vscode.commands.executeCommand("currentEditor.action.formatSelection").then(() => {
                            currentEditor.selection = wrap.sel;
                        }, (err) => {
                            vscode.window.showErrorMessage("'formatSelection' could not execute propertly");
                            console.error(err);
                        })
                    } else {
                        currentEditor.selection = wrap.sel;
                    }
                    SetCursor(setCursorLine == 'Current line' ? wrap.line : wrap.line + 1);
                })
            }

            default:
                break;
        }

        if (getSetting("formatDocument") == true) {
            vscode.commands.executeCommand("editor.action.formatDocument");   
        }

    }).catch(message => {
        console.log('vscode-wrap-console-log CANCEL: ' + message);
    });

}

function getSetting(setting: string) {
    var spl = setting.split('.');
    
    return spl.length == 1 ? vscode.workspace.getConfiguration("wrap-console-log")[setting] : spl.splice(1).reduce((a, b) => {
            return a[b]
        }, vscode.workspace.getConfiguration("wrap-console-log")[spl[0]])
}

interface WrapData {
    txt: string,
    item: string,
    sel: vscode.Selection,
    doc: vscode.TextDocument,
    ran: vscode.Range,
    ind: string,
    idx: number,
    line: number,
    lastLine: boolean
}

enum FormatAs {
    String
}

enum Wrap {
    Inline,
    Down,
    Up
}

export function deactivate() {
    return undefined;
}