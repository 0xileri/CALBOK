/** Suggestions only: the complete OCR text remains editable and is never a verified call. */
export function screenshotSuggestions(text:string){
 const normalized=text.replace(/\r\n?/g,'\n').trim();
 return {text:normalized,caller:normalized.match(/(?:^|\s)(@[A-Za-z0-9_]{1,15})\b/)?.[1]||'',coins:Array.from(new Set(normalized.match(/\$[A-Za-z][A-Za-z0-9]{0,14}\b/g)||[])).slice(0,8)};
}
