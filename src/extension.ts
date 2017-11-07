'use strict';

import * as vscode from 'vscode';

let currentEditor:vscode.TextEditor;

export function activate(context: vscode.ExtensionContext) {

    currentEditor = vscode.window.activeTextEditor;

    vscode.window.onDidChangeActiveTextEditor(editor => currentEditor = editor);

    let cWrap = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.Inline', (editor, edit) => handle(Wrap.Inline));
    let cWrapPrefix= vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.InlinePrefix', (editor, edit) => handle(Wrap.Inline, true));
    let cWrapInput= vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.InlinePrefixInput', (editor, edit) => handle(Wrap.Inline, true, true));
    let cWrapUp = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.Up', (editor, edit) => handle(Wrap.Up));
    let cWrapUpPrefix = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.UpPrefix', (editor, edit) => handle(Wrap.Up, true));
    let cWrapUpPrefixInput = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.UpPrefixInput', (editor, edit) => handle(Wrap.Up, true, true));
    let cWrapDown = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.Down', (editor, edit) => handle(Wrap.Down));
    let cWrapDownPrefix = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.DownPrefix', (editor, edit) => handle(Wrap.Down, true));
    let cWrapDownPrefixInput = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.DownPrefixInput', (editor, edit) => handle(Wrap.Down, true, true));

    context.subscriptions.push(cWrap, cWrapUp, cWrapDown, cWrapPrefix, cWrapDownPrefix, cWrapUpPrefix);
}

function handle(target: Wrap, prefix?: boolean, input?: boolean) {

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
                wrapData.txt = "console.log(".concat(txt, ");");
                resolve(wrapData);
            }
        };

    }).then((wrap:WrapData) => {

        let onEmptyAction = getSetting("onEmptyLineAction");
        let setCursor = getSetting("setCursorOnNewLine");

        function SetCursor(l) {
            let curp = new vscode.Position(l, currentEditor.document.lineAt(l).range.end.character);
            currentEditor.selection = new vscode.Selection(curp, curp)
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

                let tLine = wrap.doc.lineAt(wrap.line-1);
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
                    nxtNonEmpty = (nxtLine.isEmptyOrWhitespace) ? wrap.doc.lineAt(getTargetLine(Wrap.Down)) : undefined;
                    nxtLineInd = nxtLine.text.substring(0, nxtLine.firstNonWhitespaceCharacterIndex);
                } else {
                    nxtLineInd = "";
                }

                wrap.ind = vscode.workspace.getConfiguration("wrap-console-log")["autoFormat"] == true ? "" : wrap.ind;
                let pos = new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character);
                
                currentEditor.edit(function(e) {
                    if (nxtLine != undefined) {
                        if (nxtLine.isEmptyOrWhitespace) {
                            if (onEmptyAction == "Insert") {
                                e.insert(new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character), "\n".concat((nxtLineInd > wrap.ind ? nxtLineInd : wrap.ind), wrap.txt));
                            } else if (onEmptyAction == "Replace") {
                                e.replace(new vscode.Position(nxtLine.lineNumber, 0), wrap.ind.concat(wrap.txt));
                            }
                        } else {
                            e.insert(new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character),
                            "\n".concat((nxtLineInd.length > wrap.ind.length ? nxtLineInd : wrap.ind), wrap.txt));
                        }
                    }
                }).then(() => {
                    if (vscode.workspace.getConfiguration("wrap-console-log")["autoFormat"] == true && !wrap.lastLine) {
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

        if (vscode.workspace.getConfiguration("wrap-console-log")["formatDocument"] == true) {
            vscode.commands.executeCommand("editor.action.formatDocument");   
        }

    })
    
    
    .catch(message => {
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

enum Wrap {
    Inline,
    Down,
    Up
}

export function deactivate() {
    return undefined;
}