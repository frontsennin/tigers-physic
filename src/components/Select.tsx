import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SelectOption<T extends string> = {
  value: T
  label: string
  hint?: string
}

type Props<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  disabled?: boolean
  id?: string
  name?: string
  ariaLabel?: string
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  disabled,
  id,
  name,
  ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  /** Portal em `document.body` — precisa de ref própria; senão o outside-click fecha no mousedown antes do click da opção. */
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? options[0],
    [options, value],
  )

  const listId = useMemo(
    () => `ui-select-${id ?? name ?? 'x'}-${Math.random().toString(36).slice(2)}`,
    [id, name],
  )

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (!open) return
      const t = e.target as Node
      if (
        rootRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  useEffect(() => {
    if (!open) return

    function recompute() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      const vw = window.innerWidth
      const vh = window.innerHeight
      const desiredWidth = rect.width
      const maxWidth = Math.min(vw - 16, desiredWidth)
      const left = clamp(rect.left, 8, vw - 8 - maxWidth)
      const top = clamp(rect.bottom + 6, 8, vh - 8)

      setPos({ left, top, width: maxWidth })
    }

    recompute()
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    return () => {
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const idx = Math.max(
      0,
      options.findIndex((o) => o.value === value),
    )
    setActiveIndex(idx)
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.focus()
    })
  }, [open, options, value])

  function choose(v: T) {
    onChange(v)
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen((x) => !x)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      return
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => clamp(i + 1, 0, options.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => clamp(i - 1, 0, options.length - 1))
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(options.length - 1)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const opt = options[activeIndex]
      if (opt) choose(opt.value)
    }
  }

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIndex}"]`,
    )
    el?.scrollIntoView({ block: 'nearest' })
    el?.setAttribute('data-active', 'true')
    return () => el?.removeAttribute('data-active')
  }, [activeIndex, open])

  return (
    <div className="ui-select" ref={rootRef}>
      {/* hidden input to preserve form semantics when needed */}
      {name && <input type="hidden" name={name} value={value} />}
      <button
        id={id}
        type="button"
        ref={triggerRef}
        className="ui-select-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => !disabled && setOpen((x) => !x)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="ui-select-value">{selected?.label ?? '—'}</span>
        <span className="ui-select-chev" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="ui-select-popover"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
            onKeyDown={onListKeyDown}
          >
            <div
              id={listId}
              ref={listRef}
              className="ui-select-list"
              role="listbox"
              aria-label={ariaLabel}
            >
              {options.map((o, idx) => {
                const isSelected = o.value === value
                const isActive = idx === activeIndex
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`ui-select-opt ${isSelected ? 'is-selected' : ''} ${
                      isActive ? 'is-active' : ''
                    }`}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => choose(o.value)}
                  >
                    <span className="ui-select-opt-label">{o.label}</span>
                    {o.hint && <span className="ui-select-opt-hint">{o.hint}</span>}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

