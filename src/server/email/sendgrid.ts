import sgMail, { type MailDataRequired } from "@sendgrid/mail";
import type { ClientResponse } from "@sendgrid/client/src/response"; // For SendGrid response typing

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY not found. Email sending will be disabled.");
}

// Interface for SendGrid attachments
interface SendGridAttachment {
  content: string; // Base64 encoded content
  filename: string;
  type: string; // e.g., "image/png"
  disposition: "attachment" | "inline";
  content_id?: string; // Used for inline images
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string; // Optional plain text version
  attachments?: SendGridAttachment[]; // Optional attachments
}

const FROM_EMAIL = "noreply@gatherhub.online"; // Using your verified domain

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: EmailParams) {
  if (!process.env.SENDGRID_API_KEY) {
    console.error(
      "Attempted to send email without SENDGRID_API_KEY. Email not sent.",
    );
    // In a real app, you might want to throw an error or handle this more gracefully
    return { success: false, message: "Email sending is disabled." };
  }

  const msg: MailDataRequired = {
    to,
    from: FROM_EMAIL,
    subject,
    html,
    ...(text && { text }), // Add text version if provided
    ...(attachments && { attachments }), // Add attachments if provided
  };

  try {
    const response = (await sgMail.send(msg)) as [ClientResponse, unknown]; // Use unknown for the second element
    console.log(
      "Email sent successfully:",
      response[0].statusCode,
      response[0].headers,
    );
    return { success: true, message: "Email sent successfully." };
  } catch (error) {
    // Keep error as unknown for type safety, then check instance
    console.error("Error sending email:", error);
    let errorMessage = "Failed to send email.";
    let errorDetails: unknown = null;

    if (typeof error === "object" && error !== null && "response" in error) {
      const sgError = error as { response?: { body?: unknown } }; // Type assertion for SendGrid specific error structure
      console.error("SendGrid error response body:", sgError.response?.body);
      errorDetails = sgError.response?.body;
    }

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: "Failed to send email.", // General message
      error: errorMessage, // More specific error message if available
      details: errorDetails, // Specific details from SendGrid if available
    };
  }
}

// Example of how to use this function (you can remove this or use it for testing)
/*
if (process.env.NODE_ENV === "development") {
  // Example with attachment (ensure you have a base64 string for 'content')
  // const exampleBase64Image = "iVBORw0KGgoAAAANSUhEUgAAAAUA
  // ..... (rest of a small base64 image string)
  // sendEmail({
  //   to: "test-recipient@example.com", 
  //   subject: "Test Email with CID Image from GatherHub",
  //   html: "<h1>Hello!</h1><p>This is a test email with an inline image:</p><img src=\\"cid:testimage\\" />",
  //   text: "Hello! This is a test email with an inline image.",
  //   attachments: [{
  //     content: exampleBase64Image,
  //     filename: "test.png",
  //     type: "image/png",
  //     disposition: "inline",
  //     content_id: "testimage"
  //   }]
  // })
  //   .then((result) => console.log("Test email result:", result))
  //   .catch((err) => console.error("Test email error:", err));
}
*/
