import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

interface sendOTP 
{
  to: string, 
  otp: string
}

export const sendOtpSMS = async ({to: mobile, otp}:sendOTP) => {
  try {
    await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile,
    });
    return true;
  } catch (error) {
    console.error('Error sending SMS OTP:', error);
    return false;
  }
};
