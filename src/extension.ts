'use strict';

import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {

    let cWrap = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.Inline', (editor, edit) => {
        preWrap(false, editor).then((val: WrapStat) => {
            wrap('inline', editor, edit, val)
        });
    });

    let cWrapArg= vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.InlineArg', (editor, edit) => {
        preWrap(true, editor).then((val: WrapStat) => {
            wrap('inline', editor, edit, val)
        });
    });

    let cWrapUp = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.Up', (editor, edit)  => {
        preWrap(false, editor).then((val: WrapStat) => {
            wrap('up', editor, edit, val)
        });
    });

    let cWrapUpArg = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.UpArg', (editor, edit)  => {
        preWrap(true, editor).then((val: WrapStat) => {
            wrap('up', editor, edit, val)
        });
    });

    let cWrapDown = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.Down', (editor, edit)  => {
        preWrap(false, editor).then((val: WrapStat) => {
            wrap('down', editor, edit, val)
        });
    });

    let cWrapDownArg = vscode.commands.registerTextEditorCommand('midnight.console.log.wrap.DownArg', (editor, edit)  => {
        preWrap(true, editor).then((val: WrapStat) => {
            wrap('down', editor, edit, val)
        });
    });
    
    context.subscriptions.push(cWrap, cWrapUp, cWrapDown, cWrapArg, cWrapDownArg, cWrapUpArg);
}

function preWrap(withArg: boolean, editor: vscode.TextEditor) {
    return new Promise((resolve, reject) => {
        let sel = editor.selection;
        let len = sel.end.character - sel.start.character;
    
        let ran = len == 0 ? editor.document.getWordRangeAtPosition(sel.anchor) : 
            new vscode.Range(sel.start, sel.end);
    
        if (ran == undefined) {
            resolve(null);
        } else {
        
            let doc = editor.document;
            let lineNumber = ran.start.line;
            let txt = doc.getText(ran);
            let idx = doc.lineAt(lineNumber).firstNonWhitespaceCharacterIndex;
            let ind = doc.lineAt(lineNumber).text.substring(0, idx);
            let statObj = { txt: undefined, doc: doc, ran: ran, idx: idx, ind: ind, line: lineNumber, sel: sel, lastLine: doc.lineCount-1 == lineNumber } ;
            
            if (withArg) {
                if (vscode.workspace.getConfiguration("wrap-console-log")["customPrefix"] == true) {
                    vscode.window.showInputBox({placeHolder: 'log as', value: txt, prompt: 'Log with this'}).then((val) => {
                        statObj.txt = "console.log('".concat(val.trim(), "', ", txt ,");");
                        resolve(statObj)
                    })
                } else {
                    statObj.txt = "console.log('".concat(txt, "', ", txt ,");");
                    resolve(statObj)
                }
            } else {
                statObj.txt = "console.log(".concat(txt, ");");
                resolve(statObj);
            }
        }
    })
}

function wrap(mode: string, editor: vscode.TextEditor, edit: vscode.TextEditorEdit, stat: WrapStat) {
    
    if (mode == 'inline') {

        editor.edit(function(e) {
            e.replace(stat.ran, stat.txt);
        }).then(() => {
            editor.selection = new vscode.Selection(new vscode.Position(stat.ran.start.line, stat.txt.length + stat.ran.start.character), new vscode.Position(stat.ran.start.line, stat.txt.length + stat.ran.start.character))
        }).then(() => {
            formatIfNeeded();
        })

    } else if (mode == 'up') {
        
        editor.edit(function(e) {
            e.insert(new vscode.Position(stat.line, stat.idx), stat.txt.concat('\n', stat.ind));
        }).then(formatIfNeeded);

    } else if (mode == 'down') {

        if (!stat.lastLine) {
            stat.ind = stat.doc.lineAt(stat.line+1).text.substring(0, stat.doc.lineAt(stat.line+1).firstNonWhitespaceCharacterIndex)
        }

        stat.ind = vscode.workspace.getConfiguration("wrap-console-log")["autoFormat"] == true ? "" : stat.ind;
        let pos = new vscode.Position(stat.line, stat.doc.lineAt(stat.line).range.end.character);
        editor.edit(function(e) {
            editor.edit(function(e) {
                e.insert(new vscode.Position(stat.line, stat.doc.lineAt(stat.line).range.end.character), "\n".concat(stat.ind, stat.txt));
            }).then(formatIfNeeded);
        }).then(() => {
            if (vscode.workspace.getConfiguration("wrap-console-log")["autoFormat"] == true && !stat.lastLine) {
                let nextLineEnd = stat.doc.lineAt(stat.line+2).range.end;
                editor.selection = new vscode.Selection(stat.sel.start, nextLineEnd)
                vscode.commands.executeCommand("editor.action.formatSelection").then(() => {
                    editor.selection = stat.sel;
                }, (err) => {
                    vscode.window.showErrorMessage("'formatSelection' could not execute propertly");
                    console.error(err);
                })
            } else {
                editor.selection = stat.sel;
            }
        }).then(() => formatIfNeeded);
        
    }
}

function formatIfNeeded() {
    if (vscode.workspace.getConfiguration("wrap-console-log")["formatDocument"] == true) {
        vscode.commands.executeCommand("editor.action.formatDocument");   
    }
}

interface WrapStat {
    txt: string,
    sel: vscode.Selection,
    doc: vscode.TextDocument,
    ran: vscode.Range,
    ind: string,
    idx: number,
    line: number,
    lastLine: boolean
}

export function deactivate() {
    return undefined;
}