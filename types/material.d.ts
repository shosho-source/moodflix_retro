import React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "md-filled-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { disabled?: boolean }, HTMLElement>;
      "md-text-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { disabled?: boolean }, HTMLElement>;
      "md-icon-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { disabled?: boolean }, HTMLElement>;
      "md-linear-progress": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { indeterminate?: boolean, value?: number }, HTMLElement>;
      "md-list": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "md-list-item": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { type?: string }, HTMLElement>;
      "md-radio": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { checked?: boolean, value?: string, name?: string }, HTMLElement>;
      "md-checkbox": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { checked?: boolean, value?: string }, HTMLElement>;
      "md-elevated-card": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "md-elevation": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "md-ripple": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "md-icon": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
