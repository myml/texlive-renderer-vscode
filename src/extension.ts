// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import fetch from "node-fetch";
import { createWriteStream } from "fs";
import { URL } from "url";
import { createHash } from "crypto";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "texlive-remote-render" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "texlive-remote-render.texlive_render",
    async () => {
      if (!context.storageUri || !vscode.window.activeTextEditor) {
        return;
      }
      const server = vscode.workspace.getConfiguration().get("server");
      const document = vscode.window.activeTextEditor.document;
      const body = document.getText();
      const hash = createHash("md5").update(document.uri.fsPath).digest("hex");
      const path = vscode.Uri.joinPath(context.storageUri, hash);
      const f = createWriteStream(path.fsPath, { start: 0 });
      const url = new URL(`${server}/pdf/${hash}.pdf`);
      try {
        vscode.window.showInformationMessage("Rendering");
        const resp = await fetch(url, { method: "POST", body: body });
        console.log(resp.status, resp.statusText);
        resp.body.pipe(f);
        await new Promise((resolve, reject) => {
          resp.body.addListener("end", resolve);
          resp.body.addListener("error", reject);
        });
        const ext = resp.status == 200 ? ".pdf" : ".txt";
        const resultPath = vscode.Uri.joinPath(context.storageUri, hash + ext);
        try {
          await vscode.workspace.fs.delete(resultPath);
        } catch {}
        await vscode.workspace.fs.rename(path, resultPath);
        vscode.commands.executeCommand(
          "vscode.open",
          resultPath,
          vscode.ViewColumn.Two
        );
      } catch (err) {
        console.log(err);
        vscode.window.showErrorMessage(String(err));
      } finally {
        f.close();
      }
      return;
    }
  );
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
