import { forwardRef, type ButtonHTMLAttributes } from "react";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ className = "", type = "button", ...props }, ref) {
    return <button ref={ref} type={type} className={`app-button ${className}`} {...props} />;
  },
);