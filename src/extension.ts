// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import fetch from "node-fetch";
import { createWriteStream } from "fs";
import { createHash } from "crypto";
import * as FormData from "form-data";
import * as fs from "fs";
import * as path from "path";

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
      const images = [
        ...document.getText().matchAll(/includegraphics[.+]{(.+)}/g),
      ].map((arr) => arr[1]);
      const form = new FormData();
      form.append("main", path.basename(document.fileName));
      form.append(
        path.basename(document.fileName),
        fs.createReadStream(document.fileName)
      );
      for (const f of new Set(images)) {
        console.log(f);
        form.append(
          f,
          fs.createReadStream(path.join(path.dirname(document.fileName), f))
        );
      }
      const hash = createHash("md5").update(document.fileName).digest("hex");
      vscode.window.showInformationMessage("Rendering");
      const resp = await fetch(`${server}/pdf/${hash}.pdf`, {
        method: "POST",
        body: form,
      });
      const tmp = vscode.Uri.joinPath(context.storageUri, hash);
      await vscode.workspace.fs.writeFile(tmp, new Uint8Array());
      const f = createWriteStream(tmp.fsPath);
      resp.body.pipe(f);
      await new Promise((resolve, reject) => {
        resp.body.addListener("end", resolve);
        resp.body.addListener("error", reject);
      }).finally(() => f.close());
      const ext = resp.status == 200 ? ".pdf" : ".log";
      const resultPath = vscode.Uri.joinPath(context.storageUri, hash + ext);
      try {
        await vscode.workspace.fs.stat(resultPath);
        await vscode.workspace.fs.delete(resultPath);
      } catch {}
      await vscode.workspace.fs.rename(tmp, resultPath);
      vscode.commands.executeCommand(
        "vscode.open",
        resultPath,
        vscode.ViewColumn.Two
      );
      return;
    }
  );
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
