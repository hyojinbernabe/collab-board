import { useRef, useState, type KeyboardEvent } from "react";

interface Props {
  initialValue?: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  // return true to stay open after submitting (handy for adding several cards in a row)
  onSubmit: (value: string) => boolean | void;
  onCancel: () => void;
}

// enter saves, shift+enter adds a line, escape cancels, clicking away saves
export function InlineEditor({ initialValue = "", placeholder, multiline, className, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initialValue);
  // the browser fires blur when the editor is removed after enter, don't save twice
  const finished = useRef(false);

  const finish = (save: boolean) => {
    if (finished.current) return;
    const trimmed = value.trim();
    if (save && trimmed) {
      if (onSubmit(trimmed)) return setValue("");
    } else {
      onCancel();
    }
    finished.current = true;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      finish(false);
    }
  };

  const shared = {
    autoFocus: true,
    value,
    placeholder,
    className: `inline-editor ${className ?? ""}`,
    onKeyDown,
    onBlur: () => finish(true),
  };

  return multiline ? (
    <textarea {...shared} rows={3} onChange={(event) => setValue(event.target.value)} />
  ) : (
    <input {...shared} onChange={(event) => setValue(event.target.value)} />
  );
}
