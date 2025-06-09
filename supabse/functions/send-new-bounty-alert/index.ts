// supabase/functions/send-new-bounty-alert/index.ts
// Edge function to send an email notification when a new bounty is assigned.
// This file defines the Supabase Edge Function 'send-new-bounty-alert'.
// It uses nodemailer with Gmail OAuth2 to send an email when a new task is assigned.
// The email includes details like assignee name, task title, and a link to the task.
// It fetches Gmail credentials securely from Deno environment variables.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import nodemailer from 'npm:nodemailer@6.9.13' // Using a recent version of nodemailer

console.log('[Function: send-new-bounty-alert] Initializing...')

// Helper function for consistent HTML email structure
const createHtmlEmail = (title: string, name: string, messageBody: string, closing: string, appUrl: string, buttonText: string, buttonLink: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; margin: 0; padding: 0; background-color: #f0f2f5; color: #1c1e21; }
        .container { max-width: 580px; margin: 20px auto; background-color: #ffffff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #dddfe2; }
        .header { font-size: 22px; font-weight: 600; color: #1877f2; margin-bottom: 20px; text-align: center; border-bottom: 1px solid #dddfe2; padding-bottom: 15px; }
        .content p { line-height: 1.6; margin-bottom: 15px; font-size: 15px; }
        .content strong { color: #050505; }
        .footer { margin-top: 25px; text-align: center; font-size: 12px; color: #606770; }
        .button { display: inline-block; padding: 12px 25px; margin-top:15px; margin-bottom: 10px; background-color: #1877f2; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500; }
        a.button { color: #ffffff !important; } /* Ensure button text color is white */
        .app-name { font-weight: bold; color: #1877f2; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">${title} on <span class="app-name">Bounty Hunter</span></div>
        <div class="content">
          <p>Hey ${name || 'Hunter'},</p>
          ${messageBody}
          <p><a href="${buttonLink}" class="button">${buttonText}</a></p>
          <p>${closing}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} <a href="${appUrl}" style="color: #606770; text-decoration: none;">Bounty Hunter App</a>. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

serve(async (req: Request) => {
  console.log('[Function: send-new-bounty-alert] Invoked.')
  try {
    // Default appUrl if not provided by the trigger
    const { assigneeEmail, assigneeName, taskTitle, taskId, appUrl = 'https://bountyhunter.xyz' } = await req.json()
    console.log('[Function: send-new-bounty-alert] Request payload:', { assigneeEmail, assigneeName, taskTitle, taskId, appUrl })

    if (!assigneeEmail) {
      console.error('[Function: send-new-bounty-alert] Missing assigneeEmail in request payload')
      return new Response(JSON.stringify({ error: 'Missing assigneeEmail' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const GMAIL_USER = Deno.env.get('GMAIL_USER')
    const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID')
    const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET')
    const GMAIL_REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN')

    if (!GMAIL_USER || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
      console.error('[Function: send-new-bounty-alert] Missing Gmail OAuth2 credentials in environment variables.')
      return new Response(JSON.stringify({ error: 'Email service not configured properly.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    console.log('[Function: send-new-bounty-alert] Gmail credentials loaded.')

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      auth: {
        type: 'OAuth2',
        user: GMAIL_USER,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
      },
    })
    console.log('[Function: send-new-bounty-alert] Nodemailer transporter created.')

    const emailSubject = 'New Bounty Alert 🎯'
    // Construct the link to the specific bounty. Adjust if your URL structure is different.
    const bountyLink = `${appUrl}/dashboard/bounties/${taskId || ''}`
    const emailMessageBody = `<p>A new bounty, \"<strong>${taskTitle || 'a new mission'}</strong>\", has just been assigned to you.</p><p>Log in to your Bounty Hunter dashboard to view the details and get started!</p>`
    const emailClosing = 'Remember: no target too small, no bounty too big.'
    const buttonText = 'View Bounty Details'

    const htmlEmail = createHtmlEmail(emailSubject, assigneeName, emailMessageBody, emailClosing, appUrl, buttonText, bountyLink)

    const mailOptions = {
      from: `\"Bounty Hunter App\" <${GMAIL_USER}>`,
      to: assigneeEmail,
      subject: emailSubject,
      html: htmlEmail,
    }
    console.log('[Function: send-new-bounty-alert] Mail options prepared for:', assigneeEmail)

    await transporter.sendMail(mailOptions)
    console.log('[Function: send-new-bounty-alert] Email sent successfully to:', assigneeEmail)

    return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[Function: send-new-bounty-alert] Error:', error.message, error.stack)
    return new Response(JSON.stringify({ error: 'Failed to send email: ' + error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

console.log('[Function: send-new-bounty-alert] Setup complete.')