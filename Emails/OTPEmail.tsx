import React from "react";

interface OTPEmailProps {
  otp: string;
}
const OTPEmail: React.FC<OTPEmailProps> = ({ otp }) =>{
  return (
    <div style={{ fontFamily: "Arial, sans-serif", backgroundColor: "#f3f4f6", padding: "16px" }}>
      <div style={{ maxWidth: "600px", margin: "auto", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
          <h1 style={{ margin: "0", color: "#1f2937" }}>Soora</h1>
          <p style={{ margin: "4px 0 0", color: "#9ca3af" }}>Email Verification OTP</p>
        </div>
        <div style={{ padding: "24px", textAlign: "center" }}>
          <h2 style={{ color: "#374151", marginBottom: "16px" }}>Verify Your Email</h2>
          <p style={{ color: "#6b7280", marginBottom: "24px" }}>
            Please use the following OTP to verify your email address and complete the signup process.
          </p>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4f46e5", backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", display: "inline-block", marginBottom: "24px" }}>
            {otp}
          </div>
          <p style={{ color: "#6b7280", marginBottom: "32px" }}>
            This OTP will expire in 10 minutes. Please do not share this code with anyone.
          </p>
          <button style={{
            backgroundColor: "#4f46e5",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "4px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
          }}>
            Verify Email
          </button>
        </div>
        <div style={{ padding: "16px", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
          <small style={{ color: "#9ca3af" }}>
            © 2024 Soora. All rights reserved.
            <br />
            <a href="#" style={{ color: "#4f46e5", textDecoration: "none" }}>Privacy Policy</a> •
            <a href="#" style={{ color: "#4f46e5", textDecoration: "none" }}>Terms of Service</a>
          </small>
        </div>
      </div>
    </div>
  );
}
export default OTPEmail;