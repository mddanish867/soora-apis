import { validateTwilioConfig } from './validateTwilioConfig ';
import logger from '../lib/logger';

interface SendOTP {
  to: string;
  otp: string;
}

export const sendOtpSMS = async ({ to: mobile, otp }: SendOTP) => {
  try {
    // Validate mobile number format (E.164 format)
    if (!mobile.startsWith('+')) {
      throw new Error('Mobile number must be in E.164 format (e.g., +1234567890)');
    }

    const client = validateTwilioConfig();

    const result = await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile,
    });

    logger.info('SMS sent successfully', {
      messageId: result.sid,
      status: result.status,
      to: mobile
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error sending SMS OTP:', {
      error: errorMessage,
      to: mobile,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 6) + '***'
    });
    throw error;
  }
};