import type { ReactNode } from 'react';

interface IModalDialogShellProps {
  readonly titleId: string;
  readonly eyebrow?: string;
  readonly eyebrowClassName?: string;
  readonly title: string;
  readonly headerRight?: ReactNode;
  readonly onClose?: () => void;
  readonly closeAriaLabel?: string;
  readonly closeTestId?: string;
  readonly testId?: string;
  readonly maxWidthClassName?: string;
  readonly zIndexClassName?: string;
  readonly backdropClassName?: string;
  readonly panelClassName?: string;
  readonly headerBordered?: boolean;
  readonly children: ReactNode;
}

export function ModalCloseButton({
  onClose,
  ariaLabel,
  testId,
}: {
  readonly onClose: () => void;
  readonly ariaLabel: string;
  readonly testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      onClick={onClose}
      className="w-8 h-8 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-tabular text-sm cursor-pointer shrink-0"
    >
      ✕
    </button>
  );
}

type IModalHeaderProps = Pick<
  IModalDialogShellProps,
  'eyebrow' | 'eyebrowClassName' | 'titleId' | 'title' | 'headerRight' | 'onClose' | 'closeAriaLabel' | 'closeTestId' | 'headerBordered'
>;

function ModalHeader({
  eyebrow, eyebrowClassName, titleId, title, headerRight, onClose, closeAriaLabel, closeTestId, headerBordered,
}: IModalHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${headerBordered ? 'pb-3 border-b border-slate-800' : 'mb-3.5'}`}>
      <div>
        {eyebrow && (
          <p className={eyebrowClassName ?? 'text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-amber-400'}>{eyebrow}</p>
        )}
        <h2 id={titleId} className="font-display text-2xl font-bold text-slate-50 mt-0.5">{title}</h2>
      </div>
      {headerRight}
      {onClose && closeAriaLabel && <ModalCloseButton onClose={onClose} ariaLabel={closeAriaLabel} testId={closeTestId} />}
    </div>
  );
}

export function ModalDialogShell({
  titleId, eyebrow, eyebrowClassName, title, headerRight, onClose, closeAriaLabel, closeTestId, testId,
  maxWidthClassName = 'max-w-2xl', zIndexClassName = 'z-40', backdropClassName = 'bg-[#06080d]/85',
  panelClassName = 'bg-[#10151f] border border-slate-700 rounded-lg p-5 shadow-2xl max-h-[92vh] overflow-y-auto',
  headerBordered = false, children,
}: IModalDialogShellProps) {
  return (
    <div className={`fixed inset-0 ${zIndexClassName} ${backdropClassName} flex items-center justify-center p-4`}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid={testId} className={`w-full ${maxWidthClassName} ${panelClassName}`}>
        <ModalHeader
          eyebrow={eyebrow} eyebrowClassName={eyebrowClassName} titleId={titleId} title={title} headerRight={headerRight}
          onClose={onClose} closeAriaLabel={closeAriaLabel} closeTestId={closeTestId} headerBordered={headerBordered}
        />
        {children}
      </div>
    </div>
  );
}
