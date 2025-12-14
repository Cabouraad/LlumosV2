import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SalesInquiryRequest {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  website: string;
  teamSize: string;
  brandsCount: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      firstName, 
      lastName, 
      email, 
      company, 
      website, 
      teamSize, 
      brandsCount, 
      message 
    }: SalesInquiryRequest = await req.json();

    console.log(`[SALES-INQUIRY] New inquiry from ${email} at ${company}`);

    // Send email to sales team
    const emailResponse = await resend.emails.send({
      from: "Llumos Sales <noreply@llumos.app>",
      to: ["info@llumos.app"],
      replyTo: email,
      subject: `New Agency Sales Inquiry from ${company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
            New Sales Inquiry
          </h1>
          
          <h2 style="color: #374151;">Contact Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 140px;">Name:</td>
              <td style="padding: 8px 0;">${firstName} ${lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Company:</td>
              <td style="padding: 8px 0;">${company}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Website:</td>
              <td style="padding: 8px 0;">${website !== 'Not provided' ? `<a href="${website}">${website}</a>` : 'Not provided'}</td>
            </tr>
          </table>

          <h2 style="color: #374151; margin-top: 24px;">Company Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 140px;">Team Size:</td>
              <td style="padding: 8px 0;">${teamSize}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Brands to Track:</td>
              <td style="padding: 8px 0;">${brandsCount}</td>
            </tr>
          </table>

          <h2 style="color: #374151; margin-top: 24px;">Message</h2>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          
          <p style="color: #6b7280; font-size: 14px;">
            This inquiry was submitted through the Llumos Contact Sales form.
            Reply directly to this email to respond to the customer.
          </p>
        </div>
      `,
    });

    console.log("[SALES-INQUIRY] Email sent successfully:", emailResponse);

    // Send confirmation to customer
    await resend.emails.send({
      from: "Llumos <noreply@llumos.app>",
      to: [email],
      subject: "We received your inquiry - Llumos",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">Thank you for reaching out!</h1>
          
          <p>Hi ${firstName},</p>
          
          <p>We've received your inquiry about Llumos Agency plans for <strong>${company}</strong>.</p>
          
          <p>Our sales team will review your request and get back to you within 24 hours to discuss how Llumos can help your organization track and optimize AI search visibility.</p>
          
          <p>In the meantime, feel free to:</p>
          <ul>
            <li><a href="https://llumos.app/demo">Watch our demo video</a></li>
            <li><a href="https://llumos.app/plans/agency">Learn more about the Agency plan</a></li>
            <li><a href="https://llumos.app/resources">Browse our resources</a></li>
          </ul>
          
          <p>Best regards,<br>The Llumos Team</p>
          
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          
          <p style="color: #6b7280; font-size: 12px;">
            Llumos - AI Search Visibility Platform<br>
            <a href="https://llumos.app">llumos.app</a>
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SALES-INQUIRY] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
