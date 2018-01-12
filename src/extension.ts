'use strict';

import * as vscode from 'vscode';
import { window, QuickPickItem, workspace } from 'vscode';

let currentEditor:vscode.TextEditor;

export function activate(context: vscode.ExtensionContext) {

    currentEditor = vscode.window.activeTextEditor;

    vscode.window.onDidChangeActiveTextEditor(editor => currentEditor = editor);

    let cWrap = vscode.commands.registerTextEditorCommand('console.log.wrap', (editor, edit) => handle(Wrap.Inline));
    let cWrapString = vscode.commands.registerTextEditorCommand('console.log.wrap.string', (editor, edit) => handle(Wrap.Inline, false, false, FormatAs.String));
    let cWrapStringUp = vscode.commands.registerTextEditorCommand('console.log.wrap.string.up', (editor, edit) => handle(Wrap.Up, false, false, FormatAs.String));
    let cWrapStringDown = vscode.commands.registerTextEditorCommand('console.log.wrap.string.down', (editor, edit) => handle(Wrap.Down, false, false, FormatAs.String));
    let cWrapPrefix= vscode.commands.registerTextEditorCommand('console.log.wrap.prefix', (editor, edit) => handle(Wrap.Inline, true));
    let cWrapInput= vscode.commands.registerTextEditorCommand('console.log.wrap.input', (editor, edit) => handle(Wrap.Inline, true, true));
    let cWrapUp = vscode.commands.registerTextEditorCommand('console.log.wrap.up', (editor, edit) => handle(Wrap.Up));
    let cWrapUpPrefix = vscode.commands.registerTextEditorCommand('console.log.wrap.up.prefix', (editor, edit) => handle(Wrap.Up, true));
    let cWrapUpPrefixInput = vscode.commands.registerTextEditorCommand('console.log.wrap.up.input', (editor, edit) => handle(Wrap.Up, true, true));
    let cWrapDown = vscode.commands.registerTextEditorCommand('console.log.wrap.down', (editor, edit) => handle(Wrap.Down));
    let cWrapDownPrefix = vscode.commands.registerTextEditorCommand('console.log.wrap.down.prefix', (editor, edit) => handle(Wrap.Down, true));
    let cWrapDownPrefixInput = vscode.commands.registerTextEditorCommand('console.log.wrap.down.input', (editor, edit) => handle(Wrap.Down, true, true));
    let cSettings = vscode.commands.registerTextEditorCommand('console.log.settings', (editor, edit) => editSettings());
    
    context.subscriptions.push(cWrap, cWrapString, cWrapUp, cWrapDown, cWrapPrefix, cWrapDownPrefix, cWrapUpPrefix, cSettings);
}

function editSettings() {
    let items:QuickPickItem[] = []
    let u = new vscode.Uri();
    let t = workspace.openTextDocument(u)
    window.showQuickPick(items)
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
            let lineNumber = ran.start.line;
            let txt = doc.getText(ran);
            let idx = doc.lineAt(lineNumber).firstNonWhitespaceCharacterIndex;
            let ind = doc.lineAt(lineNumber).text.substring(0, idx);
            let wrapData = { txt: undefined, doc: doc, ran: ran, idx: idx, ind: ind, line: lineNumber, sel: sel, lastLine: doc.lineCount-1 == lineNumber } ;
            if (prefix || getSetting("alwaysUsePrefix")) {
                if (getSetting("alwaysInputBoxOnPrefix") == true || input) {
                    vscode.window.showInputBox({placeHolder: 'Prefix', value: txt, prompt: 'Use text from input box as prefix'}).then((val) => {
                        if (val != undefined) {
                            wrapData.txt = "console.log('".concat(val.trim(), "', ", txt ,");");
                            resolve(wrapData)
                        }
                    })
                } else {
                    wrapData.txt = "console.log('".concat(txt, "', ", txt ,");");
                    resolve(wrapData)
                }
            } else {
                switch (formatAs) {
                    case FormatAs.String:
                        wrapData.txt = "console.log('".concat(txt, "');");
                        break;
                
                    default:
                        wrapData.txt = "console.log(".concat(txt, ");");        
                        break;
                }
                
                resolve(wrapData);
            }
        };

    }).then((wrap:WrapData) => {

        let onEmptyAction = getSetting("onEmptyLineAction");
        let setCursor = getSetting("setCursorOnNewLine");

        function SetCursor(l) {

            let tpos;
            switch (getSetting('cursorPositionNewLine')) {
        
                case 'Same':
                    tpos = new vscode.Position(l, currentEditor.selection.anchor.character);
                    break;
            
                case 'Right':
                    tpos = new vscode.Position(l, currentEditor.document.lineAt(l).range.end.character);
                    break;

                case 'Left':
                    tpos = new vscode.Position(l, currentEditor.document.lineAt(l).range.start.character);
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
                let tLineInd = tLine.text.substring(0, tLine.firstNonWhitespaceCharacterIndex);

                currentEditor.edit(function(e) {
                    if (tLineEmpty && onEmptyAction == "Replace") {
                        e.replace(new vscode.Position(tLine.lineNumber, 0), wrap.ind.concat(wrap.txt));
                    } else {
                        e.insert(new vscode.Position(wrap.line, wrap.idx), wrap.txt.concat('\n', wrap.ind));
                    }
                }).then(() => {
                    if (setCursor) SetCursor(wrap.line);
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
                        if (onEmptyAction == "Insert") {
                            e.insert(new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character), "\n".concat((nxtLineInd > wrap.ind ? nxtLineInd : wrap.ind), wrap.txt));
                        } else if (onEmptyAction == "Replace") {
                            if (nxtLine && (nxtNonEmpty.firstNonWhitespaceCharacterIndex > 0)) {
                                e.replace(new vscode.Position(nxtLine.lineNumber, 0), " ".repeat(nxtNonEmpty.firstNonWhitespaceCharacterIndex).concat(wrap.txt));
                            } else {
                                e.replace(new vscode.Position(nxtLine.lineNumber, 0), wrap.ind.concat(wrap.txt));
                            }
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
                    if (setCursor) SetCursor(nxtLine.lineNumber);
                })
            }

            default:
                break;
        }

        if (getSetting("formatDocument") == true) {
            vscode.commands.executeCommand("editor.action.formatDocument");   
        }

    }).catch(message => {
        console.log('vscode-wrap-console REJECTED_PROMISE : ' + message);
    });

}

function getSetting(setting: string) {
    return vscode.workspace.getConfiguration("wrap-console-log")[setting]
}


interface WrapData {
    txt: string,
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