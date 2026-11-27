import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalHeader, Section, List } from '../LegalDoc'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms that apply when you use the Stockifyy website and the Stockifyy Data Portal.',
}

const gold = { color: '#c27c00' }

export default function TermsPage() {
  return (
    <article>
      <LegalHeader
        title="Terms & Conditions"
        intro="Please read these terms carefully before using our website, the Stockifyy Data Portal (portal.stockifyy.com) or engaging with any of our advisory services."
        effective="27 November 2026"
      />

      <Section n={1} title="Introduction">
        <p>
          This website and the Stockifyy Data Portal are owned and operated by Stockifyy Pvt Limited (hereinafter and
          throughout this website referred to as “we”, “us” and “our”).
        </p>
        <p>
          By using stockifyy.com or portal.stockifyy.com, you agree to these terms and any other posted guidelines. If
          you disagree, do not use our services.
        </p>
      </Section>

      <Section n={2} title="Subscription">
        <p>
          You agree to pay the specified subscription fee when subscribing to our services or packages. Where the Data
          Portal offers free access, any paid features will be clearly marked, and fees apply only if you choose to
          subscribe to them.
        </p>
      </Section>

      <Section n={3} title="Your Data Portal Account">
        <List items={[
          'You must provide accurate information when creating an account.',
          'You are responsible for keeping your password and account secure, and for all activity under your account.',
          'Accounts are for individual use and may not be shared.',
          <>Tell us immediately at <a href="mailto:info@stockifyy.com" className="font-semibold" style={gold}>info@stockifyy.com</a> if you believe your account has been accessed without permission.</>,
        ]} />
      </Section>

      <Section n={4} title="Information from External Sources">
        <p>
          We use data from public sources and data providers, which may change without notice. Market data on the Data
          Portal is provided by Capital Stake. We are not responsible for inaccuracies from these sources, and prices or
          figures may be delayed or revised by the companies or the exchange.
        </p>
      </Section>

      <Section n={5} title="No Guarantee and No Investment Advice">
        <p>
          We strive for accuracy but do not guarantee the completeness or reliability of information. We may update our
          website and the Data Portal without notice.
        </p>
        <p>
          All content, data and analysis on the Data Portal is provided for information purposes only and is not
          investment advice or a recommendation to buy, sell or hold any security. Investments may not be suitable for
          all investors. You are solely responsible for your investment decisions.
        </p>
      </Section>

      <Section n={6} title="Acceptable Use of the Data Portal">
        <p>You agree not to:</p>
        <List items={[
          'Copy, download, scrape, export, resell or redistribute data from the Data Portal, in whole or in part, without our written consent.',
          'Use data from the Data Portal to train or build artificial intelligence or machine learning models.',
          'Use bots, scripts or automated tools to access the Data Portal, or try to bypass usage limits or security controls.',
          'Interfere with, disrupt or attempt to gain unauthorised access to our services or systems.',
        ]} />
        <p>
          We may suspend or terminate accounts that break these terms or our proprietary rights, in addition to pursuing
          any necessary legal remedies.
        </p>
      </Section>

      <Section n={7} title="Limitation of Liability">
        <p>
          We are not liable for any damages arising from using or being unable to use our website or the Data Portal,
          including unauthorized access, errors, omissions, interruptions or delays, or any reliance on the information
          provided.
        </p>
      </Section>

      <Section n={8} title="Intellectual Property">
        <p>
          All content on our platforms is our intellectual property or that of our licensors (including Capital Stake for
          market data) and is protected by law. Do not reproduce or distribute it without our consent.
        </p>
      </Section>

      <Section n={9} title="Third-Party Websites">
        <p>
          We are not responsible for the content or accuracy of third-party websites linked to ours. Use them at your own
          risk.
        </p>
      </Section>

      <Section n={10} title="Privacy Policy">
        <p>
          Our Privacy Policy explains how we handle your personal information. We respect your privacy and will not share
          your information without consent, except as required by law. You can read our Privacy Policy at{' '}
          <Link href="/privacy" className="font-semibold" style={gold}>portal.stockifyy.com/privacy</Link>.
        </p>
      </Section>

      <Section n={11} title="Governing Law">
        <p>These terms are governed by the regulations of the SECP and the laws of the Government of Pakistan.</p>
      </Section>

      <Section n={12} title="Changes to Terms">
        <p>
          We may change these terms at any time without notice. Continued use of our services after changes means you
          accept the new terms.
        </p>
      </Section>

      <Section n={13} title="Contact Us">
        <p>
          If you have any questions about these terms, or any complaints about this site or the services we offer, please
          email us at <a href="mailto:info@stockifyy.com" className="font-semibold" style={gold}>info@stockifyy.com</a>.
        </p>
      </Section>
    </article>
  )
}
