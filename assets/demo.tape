# Renders assets/demo.gif. Run from the repo root: vhs assets/demo.tape
Output assets/demo.gif

Set Shell bash
Set FontSize 14
Set Width 1200
Set Height 900
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type "pnpm build > /dev/null && export DEMO_PAUSE_MS=2500 && clear" Enter
Sleep 3s
Show

Type "# An agent runs `pnpm add` through its run_command tool. What does the model read?"
Sleep 1.5s
Enter
Type "node examples/agent-tool.ts"
Sleep 500ms
Enter
Sleep 18s
