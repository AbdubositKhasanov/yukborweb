import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import './PrivacyPolicyPage.css';

const POLICY_SECTIONS = [
  ['operator', 'Contact and operator'],
  ['data', 'Data we process'],
  ['purposes', 'Why we use data'],
  ['sharing', 'How data is disclosed'],
  ['web-storage', 'Web storage and analytics'],
  ['permissions', 'Android permissions'],
  ['live-location', 'Live location'],
  ['retention', 'Retention'],
  ['rights', 'Your rights'],
  ['account-deletion', 'Account deletion'],
  ['security', 'Security'],
  ['international', 'International processing'],
  ['children', 'Children'],
  ['changes', 'Policy changes'],
];

const SUMMARY_ITEMS = [
  {
    number: '01',
    title: 'Location is optional',
    text: 'Precise location is collected only when an eligible driver turns on visible live sharing.',
  },
  {
    number: '02',
    title: 'No targeted ads',
    text: 'We do not sell personal data. The public Android app contains no advertising SDK.',
  },
  {
    number: '03',
    title: 'You stay in control',
    text: 'You can request access, correction, or deletion through verified Cargover support.',
  },
];

function PolicySection({ id, index, title, children, featured = false }) {
  return (
    <section
      id={id}
      className={`privacy-section${featured ? ' privacy-section--featured' : ''}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="privacy-section__heading">
        <span className="privacy-section__number" aria-hidden="true">
          {String(index).padStart(2, '0')}
        </span>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <div className="privacy-section__body">{children}</div>
    </section>
  );
}

function SupportLink({ children = 'Open Telegram support', className = '' }) {
  return (
    <a className={className} href="https://t.me/yukborsupport" target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function PrivacyPolicyPage() {
  const location = useLocation();
  const isDeletionEntry = location.pathname === '/delete-account';

  useEffect(() => {
    if (!isDeletionEntry) return;
    window.requestAnimationFrame(() => {
      document.getElementById('account-deletion')?.scrollIntoView({ block: 'start' });
    });
  }, [isDeletionEntry]);

  return (
    <div className="privacy-page">
      <Helmet>
        <title>Privacy Policy | Cargover · Yuk bor</title>
        <meta
          name="description"
          content="Learn how Cargover and the Yuk bor logistics service collect, use, share, retain, and delete personal data."
        />
        <link rel="canonical" href="https://cargover.uz/privacy" />
        <meta property="og:title" content="Privacy Policy | Cargover · Yuk bor" />
        <meta
          property="og:description"
          content="A clear guide to data, privacy, location controls, and account deletion in Yuk bor."
        />
        <meta property="og:url" content="https://cargover.uz/privacy" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="privacy-hero">
        <div className="privacy-hero__glow" aria-hidden="true" />
        <div className="privacy-shell privacy-hero__inner">
          <div className="privacy-hero__breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Yuk bor</Link>
            <span aria-hidden="true">/</span>
            <span>Privacy</span>
          </div>
          <div className="privacy-hero__content">
            <div>
              <p className="privacy-eyebrow">Privacy policy</p>
              <h1>Clear rules for data that keeps logistics moving.</h1>
              <p className="privacy-hero__lead">
                This policy explains how Cargover handles information across the Yuk bor Android
                app, cargover.uz, and related Telegram experiences.
              </p>
              <div className="privacy-hero__actions">
                <a className="privacy-button privacy-button--primary" href="#account-deletion">
                  Delete my account
                </a>
                <SupportLink className="privacy-button privacy-button--secondary">
                  Ask a privacy question
                </SupportLink>
              </div>
            </div>
            <div className="privacy-hero__meta" aria-label="Policy dates and scope">
              <div>
                <span>Effective</span>
                <strong>10 August 2026</strong>
              </div>
              <div>
                <span>Last updated</span>
                <strong>10 August 2026</strong>
              </div>
              <div>
                <span>Applies to</span>
                <strong>Cargover · Yuk bor</strong>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="privacy-shell">
          <section className="privacy-summary" aria-labelledby="privacy-summary-title">
            <div className="privacy-summary__intro">
              <p className="privacy-eyebrow">At a glance</p>
              <h2 id="privacy-summary-title">Privacy without the fine-print fog.</h2>
            </div>
            <div className="privacy-summary__grid">
              {SUMMARY_ITEMS.map((item) => (
                <article key={item.number} className="privacy-summary__card">
                  <span>{item.number}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="privacy-layout">
            <aside className="privacy-toc">
              <nav aria-label="Privacy policy sections">
                <p>On this page</p>
                <ol>
                  {POLICY_SECTIONS.map(([id, label], index) => (
                    <li key={id}>
                      <a href={`#${id}`}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        {label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="privacy-toc__help">
                <span aria-hidden="true">?</span>
                <p>Need help with your data?</p>
                <SupportLink>Contact support</SupportLink>
              </div>
            </aside>

            <article className="privacy-document">
              <div className="privacy-intro">
                <p>
                  Cargover operates the <strong>Yuk bor</strong> logistics marketplace, including
                  the Yuk bor Android application (package <code>uz.yukbor.app</code>), services at
                  cargover.uz, and related Telegram bot and support experiences. “Cargover,” “Yuk
                  bor,” “we,” “us,” and “our” refer to the operator of those services.
                </p>
                <p>
                  This policy applies to registered users, people whose information is submitted by
                  another authorized user, and people whose logistics listings are lawfully obtained
                  from public or partner sources.
                </p>
              </div>

              <PolicySection id="operator" index={1} title="Contact and data operator">
                <div className="privacy-contact-card">
                  <div>
                    <span>Service and data operator</span>
                    <strong>Cargover, operator of the Yuk bor service</strong>
                  </div>
                  <div>
                    <span>Website</span>
                    <a href="https://cargover.uz">cargover.uz</a>
                  </div>
                  <div>
                    <span>Privacy, access, correction, and deletion</span>
                    <SupportLink>@yukborsupport on Telegram</SupportLink>
                  </div>
                </div>
                <div className="privacy-note">
                  <strong>Keep your account secure.</strong> Never send a one-time login code,
                  access token, password, or other secret to support.
                </div>
              </PolicySection>

              <PolicySection id="data" index={2} title="Data we process">
                <p>The information we process depends on which Yuk bor features you use.</p>

                <h3>Account and profile data</h3>
                <ul>
                  <li>
                    Name, phone number, Telegram username, and Telegram user or chat identifier.
                  </li>
                  <li>
                    Language, role, optional gender selection, account time, and account status.
                  </li>
                  <li>
                    Inviter, counterparty, dispatcher, permission, and organization relationships.
                  </li>
                  <li>Subscription, tariff, feature-limit, and account-balance information.</li>
                  <li>Short-lived login codes, access tokens, and session status.</li>
                </ul>

                <h3>Logistics and marketplace data</h3>
                <ul>
                  <li>
                    Cargo and transport listings, routes, locations, vehicle type, capacity, weight,
                    price, status, dates, descriptions, and saved templates.
                  </li>
                  <li>
                    Contact numbers, Telegram usernames, vehicle registration numbers, source links,
                    source groups, sender information, and original listing text.
                  </li>
                  <li>
                    Offers, assignments, matches, contact-access events, reports, listing history,
                    recurring needs, availability, alerts, and notification preferences.
                  </li>
                </ul>
                <p>
                  Some listing information and permitted contact details are designed to be shown to
                  other marketplace users or distributed to relevant Telegram groups.
                </p>

                <h3>CRM, reminder, and support data</h3>
                <ul>
                  <li>
                    Company and contact details, tax identifiers, addresses, business type, routes,
                    preferences, payment terms, notes, tags, and custom fields entered by an
                    authorized user.
                  </li>
                  <li>Reminders, schedules, notification status, and related notes.</li>
                  <li>Support messages, complaints, reports, and other communications.</li>
                  <li>Operational audit information, such as recent dispatcher listing views.</li>
                </ul>
                <p>
                  If you enter personal data about another person, you are responsible for having a
                  lawful basis and providing any notice or permission required by law.
                </p>

                <h3>Precise driver location</h3>
                <p>
                  When an eligible driver turns on <strong>Live location</strong> and grants Android
                  permission, we may collect latitude and longitude, accuracy, altitude, speed,
                  bearing, timestamps, battery and charging status, and a sharing-session
                  identifier.
                </p>

                <h3>Device, network, and application data</h3>
                <ul>
                  <li>
                    Firebase Installation ID, device manufacturer and model, app version, platform,
                    locale, and push registration status.
                  </li>
                  <li>Notification delivery and deep-link information.</li>
                  <li>
                    IP address, request time and path, response status, and security or error
                    details when recorded by our servers or infrastructure providers.
                  </li>
                  <li>Searches, filters, feature use, and similar operational events.</li>
                </ul>
                <p>
                  The Android app stores an access token and Firebase registration locally, with app
                  backup disabled. It does not request device contacts, call log, microphone,
                  camera, media library, or advertising ID. Firebase Analytics is disabled in the
                  Android app.
                </p>
                <p>
                  The website uses local or session storage for authentication, preferences, and
                  interface state. It also uses Firebase Analytics for page views, feature usage,
                  first opens, role, and similar usage events.
                </p>

                <h3>Telephone call data</h3>
                <p>
                  The public Android app does not record calls or access the call log. If you speak
                  with an operator using a separately configured business call workflow, we may
                  process call metadata and—only where enabled and legally permitted—call audio. We
                  provide or require an appropriate notice and consent where law requires it.
                </p>

                <h3>Data from Telegram and other sources</h3>
                <p>
                  Data may come from you, your device, Telegram, authorized users or administrators,
                  public logistics groups and posts, partner listings, and service providers. If you
                  believe a record was added without a valid basis, contact us with enough
                  information to locate it.
                </p>
              </PolicySection>

              <PolicySection id="purposes" index={3} title="Why we use data">
                <p>We use personal data to:</p>
                <ul>
                  <li>
                    Create accounts, authenticate users, restore sessions, and enforce permissions.
                  </li>
                  <li>Publish, search, match, manage, and distribute logistics listings.</li>
                  <li>Connect users and help authorized dispatchers coordinate logistics.</li>
                  <li>
                    Provide offers, assignments, CRM, reminders, alerts, support, and saved forms.
                  </li>
                  <li>Deliver push messages and optional live-location coordination.</li>
                  <li>Administer subscriptions, balances, entitlements, and misuse controls.</li>
                  <li>Secure, troubleshoot, measure, and improve the service.</li>
                  <li>Comply with law, enforce agreements, and resolve disputes.</li>
                </ul>
                <p>
                  Where applicable, we rely on consent, performance of our agreement with you,
                  legitimate interests in operating and protecting the marketplace, or legal
                  obligations. Precise location and call audio have the additional controls
                  described in this policy and any required in-product notice.
                </p>
              </PolicySection>

              <PolicySection id="sharing" index={4} title="How data is disclosed">
                <h3>Other users and authorized personnel</h3>
                <p>
                  Listing data, selected profile information, and permitted contact details may be
                  shown to relevant users. Authorized dispatchers and administrators may access data
                  required for operations, reports, subscriptions, support, or delivery
                  coordination.
                </p>

                <h3>Telegram</h3>
                <p>
                  We use Telegram for account setup, login help, bot functions, support, alerts,
                  offers, and listing distribution. Content sent to a group or recipient may be
                  copied, forwarded, or retained outside our control. Telegram follows its own{' '}
                  <a href="https://telegram.org/privacy" target="_blank" rel="noreferrer">
                    privacy policy
                  </a>
                  .
                </p>

                <h3>Google and Firebase</h3>
                <p>
                  The Android app uses Firebase Cloud Messaging and Installations for push delivery.
                  After authenticated registration, our server receives the Firebase Installation
                  ID, app version, device model, and locale. Exact driver coordinates go to the
                  Cargover API, not into Firebase Analytics or an FCM message payload. The website
                  uses Firebase Analytics. Review Google’s{' '}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                    privacy policy
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://firebase.google.com/support/privacy/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Firebase privacy information
                  </a>
                  .
                </p>

                <h3>Vendors, legal recipients, and business transfers</h3>
                <p>
                  We may use restricted hosting, database, security, communications, and
                  professional service providers. We may also disclose data when required by law, to
                  protect rights and safety, or as part of a lawful transfer of the service.
                </p>
                <div className="privacy-callout">
                  <span aria-hidden="true">✓</span>
                  <p>
                    <strong>No data sale or targeted advertising.</strong> We do not sell personal
                    data or share it with third-party advertisers for targeted ads. The Android app
                    contains no advertising SDK.
                  </p>
                </div>
              </PolicySection>

              <PolicySection id="web-storage" index={5} title="Web storage and analytics choices">
                <p>
                  The website uses local storage and session storage for login state, preferences,
                  navigation, and service operation. Removing or blocking storage may sign you out
                  or prevent features from working. Browser controls and privacy extensions may
                  limit analytics. The Android app does not use Firebase Analytics.
                </p>
              </PolicySection>

              <PolicySection id="permissions" index={6} title="Android permissions">
                <div className="privacy-permissions">
                  <article>
                    <span aria-hidden="true">N</span>
                    <div>
                      <h3>Notifications</h3>
                      <p>Offers, reminders, account updates, and dispatcher messages.</p>
                    </div>
                  </article>
                  <article>
                    <span aria-hidden="true">L</span>
                    <div>
                      <h3>Approximate or precise location</h3>
                      <p>Requested only when a driver chooses live sharing.</p>
                    </div>
                  </article>
                  <article>
                    <span aria-hidden="true">F</span>
                    <div>
                      <h3>Foreground service</h3>
                      <p>Keeps active sharing visible through a persistent system notification.</p>
                    </div>
                  </article>
                </div>
                <p>
                  You can deny or disable these permissions. The app does not request Android
                  background location and does not perform hidden location tracking.
                </p>
              </PolicySection>

              <PolicySection
                id="live-location"
                index={7}
                title="Live-location controls and retention"
              >
                <p>
                  Live location is off until an eligible driver turns it on. Android asks for
                  location and notification permissions, and a persistent system notification stays
                  visible while the location foreground service is active. Updates may continue when
                  the app is not on screen only during that visible service session.
                </p>
                <p>
                  Authorized Cargover administrators or dispatchers may use location to assess
                  driver freshness and coordinate logistics. It is not shown to the general public.
                  A remote refresh request starts no hidden tracking; if the visible service is not
                  running, the app displays a notification.
                </p>
                <div className="privacy-retention-stat">
                  <strong>30 days</strong>
                  <p>
                    Historical location events are configured to expire after 30 days. Turning
                    sharing off stops new uploads and invalidates the sharing session.
                  </p>
                </div>
                <p>
                  The most recent location snapshot may remain on the driver account until replaced,
                  removed after a valid request, or deleted with the account, subject to lawful
                  retention obligations.
                </p>
              </PolicySection>

              <PolicySection id="retention" index={8} title="Retention">
                <p>
                  We retain information only for as long as reasonably necessary to provide and
                  secure the service, resolve disputes, and comply with law. Current practices
                  include:
                </p>
                <ul>
                  <li>One-time login codes and access tokens expire automatically.</li>
                  <li>
                    Android device registrations are removed on logout, replacement, invalidation,
                    or account deletion, subject to provider-side timing.
                  </li>
                  <li>Precise driver-location history is configured to expire after 30 days.</li>
                  <li>Authorized dispatcher view-history entries expire after 24 hours.</li>
                  <li>
                    Account, listing, CRM, reminder, subscription, support, and transaction records
                    remain while their operational purpose is active and afterward only as required.
                  </li>
                  <li>Security logs and backups may persist for a limited rotation period.</li>
                </ul>
                <p>
                  Copies already sent to Telegram, received by another user, included in a completed
                  business record, or retained by law may not disappear immediately when a source
                  record is deleted.
                </p>
              </PolicySection>

              <PolicySection id="rights" index={9} title="Your rights and choices">
                <p>Subject to applicable law, you may ask us to:</p>
                <ul>
                  <li>Confirm processing and provide access to your personal data.</li>
                  <li>Correct inaccurate or incomplete data.</li>
                  <li>Delete data or your account.</li>
                  <li>Withdraw consent, including by turning off live location.</li>
                  <li>Object to or restrict certain processing.</li>
                  <li>Explain the source, purpose, or recipients of your data.</li>
                </ul>
                <p>
                  You can update supported profile fields, remove supported listings and records,
                  disable notifications, and turn live location off in the driver status screen.
                </p>
                <p>
                  Contact <SupportLink>@yukborsupport</SupportLink> to exercise a right. We may
                  verify identity to prevent unauthorized access or deletion. If a legal, security,
                  fraud-prevention, accounting, or dispute obligation limits a request, we will
                  explain where permitted. You may also complain to the competent data authority.
                </p>
              </PolicySection>

              <PolicySection
                id="account-deletion"
                index={10}
                title="Account and data deletion"
                featured
              >
                <p className="privacy-section__lead">
                  Send <strong>“Delete my Yuk bor account”</strong> to verified Cargover support
                  from the Telegram identity associated with your account, or provide the registered
                  phone number through the verified support process.
                </p>
                <ol className="privacy-steps">
                  <li>
                    <span>1</span>
                    <div>
                      <strong>Submit your request</strong>
                      <p>Use the support button below. Never send a login code or access token.</p>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>Verify account ownership</strong>
                      <p>We may request limited information to prevent unauthorized deletion.</p>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Deletion and confirmation</strong>
                      <p>We normally complete a verified request within 30 calendar days.</p>
                    </div>
                  </li>
                </ol>
                <SupportLink className="privacy-button privacy-button--dark">
                  Request account deletion
                </SupportLink>
                <p>
                  We delete or anonymize associated data that is no longer required, disable
                  sessions and device registrations, stop location sharing, and remove
                  user-controlled active content where appropriate. Data retained for law, security,
                  fraud prevention, accounting, completed transactions, or disputes is isolated from
                  ordinary use and deleted when the reason ends.
                </p>
                <p>
                  Deleting Yuk bor does not delete your Telegram account or copies controlled by
                  Telegram, a group, or another recipient. Use Telegram’s own controls for that
                  data.
                </p>
              </PolicySection>

              <PolicySection id="security" index={11} title="Security">
                <p>
                  We use reasonable administrative, technical, and organizational safeguards,
                  including HTTPS, authenticated API access, authorization controls, secret
                  management, restricted administration, expiring credentials, and authorization
                  header redaction in Android network logs. No storage or transmission method is
                  completely secure, so absolute security cannot be guaranteed.
                </p>
                <p>
                  Protect your device and Telegram account, never share login codes or access
                  tokens, and notify us if you suspect unauthorized access.
                </p>
              </PolicySection>

              <PolicySection id="international" index={12} title="International processing">
                <p>
                  Providers such as Google and Telegram may process data outside the country where
                  you live. Where data is transferred internationally, we use the basis and
                  safeguards required by applicable law and comply with applicable localization
                  requirements.
                </p>
              </PolicySection>

              <PolicySection id="children" index={13} title="Children">
                <p>
                  Yuk bor is a business logistics service and is not directed to people under 18. We
                  do not knowingly create accounts for children. Contact us if you believe a child’s
                  data was submitted so we can investigate and act appropriately.
                </p>
              </PolicySection>

              <PolicySection id="changes" index={14} title="Changes to this policy">
                <p>
                  We may update this policy when the service, data practices, providers, or legal
                  requirements change. We will publish the revised version at this stable URL and
                  update the date above. Material changes affecting sensitive data or rights receive
                  additional notice where required.
                </p>
              </PolicySection>
            </article>
          </div>
        </div>
      </main>

      <footer className="privacy-footer">
        <div className="privacy-shell privacy-footer__inner">
          <div className="privacy-footer__brand">
            <img src="/yukbor-logo.jpg" alt="" />
            <div>
              <strong>Yuk bor</strong>
              <span>Powered by Cargover</span>
            </div>
          </div>
          <p>Privacy should be as clear as the route ahead.</p>
          <div className="privacy-footer__links">
            <Link to="/">Marketplace</Link>
            <Link to="/tariffs">Tariffs</Link>
            <SupportLink>Support</SupportLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
