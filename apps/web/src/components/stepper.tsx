"use client";

import { Check } from "lucide-react";

interface StepperProps {
  currentStep: number;
  steps: { label: string; description: string }[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "32px 16px",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        const isFuture = currentStep < stepNum;

        return (
          <div
            key={step.label}
            style={{
              display: "flex",
              alignItems: "center",
              flex: index < steps.length - 1 ? 1 : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                minWidth: 80,
              }}
            >
              {/* Circle */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  transition: "all var(--transition-base)",
                  ...(isCompleted
                    ? {
                        background: "linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-dark)))",
                        color: "#fff",
                        boxShadow: "0 2px 8px hsl(var(--brand-primary) / 0.3)",
                      }
                    : isActive
                      ? {
                          background: "linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-dark)))",
                          color: "#fff",
                          boxShadow: "0 2px 12px hsl(var(--brand-primary) / 0.4)",
                          transform: "scale(1.1)",
                        }
                      : {
                          background: "hsl(var(--bg-secondary))",
                          color: "hsl(var(--text-muted))",
                          border: "2px solid hsl(var(--border-primary))",
                        }),
                }}
              >
                {isCompleted ? <Check size={18} /> : stepNum}
              </div>

              {/* Label */}
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isFuture
                      ? "hsl(var(--text-muted))"
                      : "hsl(var(--text-primary))",
                    transition: "color var(--transition-fast)",
                  }}
                >
                  {step.label}
                </p>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "hsl(var(--text-muted))",
                    marginTop: 2,
                    display: isActive ? "block" : "none",
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  marginInline: 8,
                  marginBottom: 32,
                  borderRadius: 2,
                  background: isCompleted
                    ? "linear-gradient(90deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-light)))"
                    : "hsl(var(--border-primary))",
                  transition: "background var(--transition-slow)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
