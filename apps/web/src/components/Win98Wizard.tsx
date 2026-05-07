import type { ReactNode } from 'react';

export interface WizardStep {
  label: string;
}

interface Win98WizardProps {
  title: string;
  steps: WizardStep[];
  currentStep: number;
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  children: ReactNode;
}

export function Win98Wizard({
  title,
  steps,
  currentStep,
  onBack,
  onNext,
  onCancel,
  nextLabel = 'Next →',
  children,
}: Win98WizardProps) {
  return (
    <div className="w98-wizard">
      <div className="w98-wizard__sidebar">
        <div className="w98-wizard__sidebar-mark">∴</div>
        <div className="w98-wizard__sidebar-title">{title}</div>
        <div className="w98-wizard__sidebar-steps">
          {steps.map((step, i) => (
            <div
              key={step.label}
              className={`w98-wizard__step-item${i === currentStep ? ' w98-wizard__step-item--active' : ''}`}
            >
              {i + 1}. {step.label}
            </div>
          ))}
        </div>
      </div>
      <div className="w98-wizard__content">{children}</div>
      <div className="w98-wizard__footer">
        {onCancel && <button className="w98-btn" onClick={onCancel}>Cancel</button>}
        {onBack && (
          <button className="w98-btn" onClick={onBack} disabled={currentStep === 0}>
            ← Back
          </button>
        )}
        {onNext && (
          <button className="w98-btn w98-btn--default" onClick={onNext}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
