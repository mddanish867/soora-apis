import axios from "axios";

interface sendOTP 
{
  to: string, 
  otp: string
}

// Helper function to send OTP via email using Resend
export async function sendOtpEmail({to: email, otp}:sendOTP) {
  const resendApiKey = process.env.RESEND_API_KEY; 

  if (!resendApiKey) {
    throw new Error("Resend API key is missing");
  }

  try {
    
    // Send email using Resend API
    const response = await axios.post(
      "https://api.resend.com/emails", // Resend API endpoint
      {
        from: "onboarding@resend.dev", // Use your email address as the sender
        to:email,
        subject: "Soora | Email Verification OTP",        
        html: `<p>Your verification OTP is: <strong>${otp}</strong></p>`,
      },
      {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      console.log(`OTP sent to ${email}`);
      return true; // Email sent successfully
    } else {
      console.error(`Failed to send OTP email. Response status: ${response.status}, Response body: ${JSON.stringify(response.data)}`);
      throw new Error("Failed to send OTP email, check API response for more details.");
    }
  } catch (error) {
    // Log the full error details for debugging
    console.error("Error sending email:", error);

    // Return a more detailed error message
    throw new Error("An error occurred while sending OTP email. Please check the logs for more details.");
  }
}
