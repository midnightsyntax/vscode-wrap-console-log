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
                currentEditor.edit(function(e) {
                    e.insert(new vscode.Position(wrap.line, wrap.idx), wrap.txt.concat('\n', wrap.ind));
                });
            } break;

            case Wrap.Down: {

                let nxtLine;
                let nxtLineEmpty;

                if (!wrap.lastLine) {
                    nxtLine = wrap.doc.lineAt(wrap.line+1);
                    nxtLineEmpty = nxtLine.text.trim() == '' ? true : false;
                }

                wrap.ind = vscode.workspace.getConfiguration("wrap-console-log")["autoFormat"] == true ? "" : wrap.ind;
                let pos = new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character);
                
                currentEditor.edit(function(e) {
                    currentEditor.edit(function(e) {
                        if (nxtLineEmpty) {
                            e.replace(new vscode.Position(nxtLine.lineNumber, 0), wrap.ind.concat(wrap.txt));
                        } else {
                            e.insert(new vscode.Position(wrap.line, wrap.doc.lineAt(wrap.line).range.end.character), "\n".concat(wrap.ind, wrap.txt));
                        }
                    })
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