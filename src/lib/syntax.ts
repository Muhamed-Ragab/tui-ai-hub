import { SyntaxStyle } from "@opentui/core";

let _style: SyntaxStyle | null = null;

export function getSyntaxStyle(): SyntaxStyle {
  if (!_style) {
    _style = SyntaxStyle.create();
  }
  return _style;
}
