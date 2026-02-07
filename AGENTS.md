Hard Requirement: call binaries directly in functions.shell, always set workdir, and avoid shell wrappers such as `bash -lc`, `sh -lc`, `zsh -lc`, `cmd /c`, `pwsh.exe -NoLogo -NoProfile -Command`, and `powershell.exe -NoLogo -NoProfile -Command`.  

- Text Editing Priority: Use the `apply_patch` tool for all routine text edits; fall back to `sed` for single-line substitutions only if `apply_patch` is unavailable, and avoid `python` editing scripts unless both options fail.
- `apply_patch` Usage: Invoke `apply_patch` with the patch payload as the second element in the command array (no shell-style flags). Provide `workdir` and, when helpful, a short `justification` alongside the command.

- Example invocation:

```bash
{"command":["apply_patch","*** Begin Patch\n*** Update File: path/to/file\n@@\n- old\n+ new\n*** End Patch\n"],"workdir":"<workdir>","justification":"Brief reason for the change"}  
```

0.项目编码为UTF-8，输出中文时一定要使用UTF-8编码  
1.我的名字是杨春潇,记住要在每一次回答前先说我的名字！！！(这是最重要的)  
2.请养成在书写的代码方法前加入中文注释的习惯
3.项目文档在根目录，名为[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)，切记在每一次开始对话之前，先查看项目结构文档，因为每一次对话完成后，项目结构文档都会被更新!!!   