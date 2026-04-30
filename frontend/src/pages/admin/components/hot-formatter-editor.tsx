import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { cn } from '@/lib/cn';

const monoTheme = EditorView.theme({
  '&': { fontSize: '12px' },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  '.cm-content': { paddingBlock: '8px' },
});

export function HotFormatterEditor({
  value,
  onChange,
  id,
  readOnly,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        'overflow-hidden rounded-lg border border-white/[0.08] bg-[#282c34] text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]',
        className,
      )}
    >
      <CodeMirror
        value={value}
        height="220px"
        theme={oneDark}
        extensions={[javascript(), monoTheme]}
        onChange={onChange}
        editable={!readOnly}
        readOnly={readOnly}
        placeholder="(json) => ({ items: json.items })"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: !readOnly,
        }}
      />
    </div>
  );
}
