import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalHeader, Section, List } from '../LegalDoc'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Stockifyy collects, uses and protects your information on the Stockifyy Data Portal.',
}

export default function PrivacyPage() {
  return (
    <article>
      <LegalHeader
        title="Privacy Policy"
        intro="Your privacy matters to us. This policy explains what information we collect, how we use it, and how we protect it when you use the Stockifyy website and the Stockifyy Data Portal (portal.stockifyy.com)."
        effective="27 November 2026"
      />

      <Section n={1} title="Consent to Use Information">
        <p>
          By using the Stockifyy (Pvt.) Limited website, the Stockifyy Data Portal or any of our services, you agree to
          this Privacy Policy. If you disagree, please stop using our services immediately.
        </p>
      </Section>

      <Section n={2} title="Information We Collect">
        <p>
          <strong>Non-Personal Information:</strong> includes web requests, browser type, device type, pages visited
          and time spent on pages. This is collected for security, auditing and statistical purposes.
        </p>
        <p>
          <strong>Personal Information:</strong> includes name, gender, phone number, email, address, any information
          given in the KYC form, and IP address. We collect this as per the requirements of the SECP.
        </p>
        <p><strong>Data Portal account information:</strong> when you create an account on the Data Portal we collect:</p>
        <List items={[
          'Your name and email address.',
          'If you sign in with Google: your name, email address and profile picture as shared by Google. We never receive your Google password.',
          'Your account settings and the stocks you add to your watchlist.',
          'Sign-in and session records (such as login time and IP address) used to keep your account secure.',
        ]} />
      </Section>

      <Section n={3} title="Purpose of Collection">
        <p>
          We collect information to provide and improve our services and for research. Non-personal information helps
          us enhance our services based on user preferences. We also collect information entered into KYC and other
          forms on our site as per SECP requirements, in our capacity as your financial advisor.
        </p>
        <p>
          On the Data Portal, your account information is used to sign you in, keep your session secure, save your
          watchlist and preferences, and contact you about your account.
        </p>
      </Section>

      <Section n={4} title="Sharing Information">
        <p>We do not sell your personal information. We may share information with:</p>
        <List items={[
          'Our team members.',
          'Legal authorities, if required.',
          <>Service providers that run the Data Portal on our behalf, only as needed to provide it: Supabase (account
            sign-in and database), Vercel (website hosting), Upstash (temporary data caching) and Google (if you choose
            “Continue with Google”).</>,
        ]} />
        <p>
          Market data shown on the Data Portal is provided by Capital Stake. We do not share your personal information
          with Capital Stake.
        </p>
      </Section>

      <Section n={5} title="Cookies and Sessions">
        <p>
          The Data Portal uses essential cookies and browser storage to keep you signed in and to remember basic
          preferences (such as theme). These are required for the portal to work. We do not use advertising cookies.
        </p>
      </Section>

      <Section n={6} title="User Rights and Retention">
        <p>
          You can access, correct, update or object to the use of your personal information via our Contact Us page or
          by emailing us. You can also ask us to delete your Data Portal account and its data. We retain your
          information as long as needed to provide our services and to comply with legal obligations.
        </p>
      </Section>

      <Section n={7} title="Security and Confidentiality">
        <p>
          We take industry-standard security measures to protect your personal information, including encrypted
          connections (HTTPS), securely stored passwords and access controls so that each user can only see their own
          account data. However, we cannot guarantee complete security, and you share information at your own risk.
        </p>
      </Section>

      <Section n={8} title="Links to Other Websites">
        <p>
          This Privacy Policy applies only to our services. We are not responsible for third-party websites linked from
          our site. Please read their privacy policies before use.
        </p>
      </Section>

      <Section n={9} title="Contact Information">
        <p>
          For any questions about this Privacy Policy, email us at{' '}
          <a href="mailto:info@stockifyy.com" className="font-semibold" style={{ color: '#c27c00' }}>info@stockifyy.com</a>.
        </p>
      </Section>

      <Section n={10} title="Updates to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Check the effective date above for updates. Your
          continued use of our services means you accept the changes.
        </p>
      </Section>

      <p className="mt-10 text-sm" style={{ color: '#64748b' }}>
        See also our <Link href="/terms" className="font-semibold" style={{ color: '#c27c00' }}>Terms &amp; Conditions</Link>.
      </p>
    </article>
  )
}
