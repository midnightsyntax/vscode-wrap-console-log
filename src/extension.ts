'use strict';

import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {

    let cWrap = vscode.commands.registerTextEditorCommand('midnight.console.log.Wrap.Inline', (editor, edit) => {
        wrap('inline', editor, edit);
    });

    let cWrapUp = vscode.commands.registerTextEditorCommand('midnight.console.log.Wrap.Up', (editor, edit)  => {
        wrap('up', editor, edit);
    });

    let cWrapDown = vscode.commands.registerTextEditorCommand('midnight.console.log.Wrap.Down', (editor, edit)  => {
        wrap('down', editor, edit);
    });
    
    context.subscriptions.push(cWrap, cWrapUp, cWrapDown);
}

function wrap(mode: string, editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
    let sel = editor.selection;
    let len = sel.end.character - sel.start.character;
    let ran = len == 0 ? editor.document.getWordRangeAtPosition(sel.anchor) : 
        new vscode.Range(sel.start, sel.end);
    if (ran == undefined) return;
    let doc = editor.document;
    let lineNumber = ran.start.line;
    let txt = doc.getText(ran);
    let idx = doc.lineAt(lineNumber).firstNonWhitespaceCharacterIndex;
    let ind = doc.lineAt(lineNumber).text.substring(0, idx);
    if (mode == 'inline') {
        let rep = "console.log(".concat(txt, ');');
        editor.edit(function(e) {
            edit.replace(ran, rep);
        }).then(() => {
            editor.selection = new vscode.Selection(new vscode.Position(ran.start.line, rep.length + ran.start.character), new vscode.Position(ran.start.line, rep.length + ran.start.character))
        })
    } else if (mode == 'up') {
        edit.insert(new vscode.Position(lineNumber, doc.lineAt(lineNumber).firstNonWhitespaceCharacterIndex), 'console.log('.concat(txt, ');\n', ind) );
    } else if (mode == 'down') {
        let pos = new vscode.Position(lineNumber, doc.lineAt(lineNumber).range.end.character);
        editor.edit(function(e) {
            edit.insert(new vscode.Position(lineNumber, doc.lineAt(lineNumber).range.end.character), "\n".concat(ind, "console.log(", txt, ');'));
        }).then(() => {
            editor.selection = sel;
        });
    }
}

export function deactivate() {
    return undefined;
}