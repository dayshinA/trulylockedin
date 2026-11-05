import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

// The one layout every email uses. Email clients can't read the site's CSS
// variables, so the brand colours are repeated here as hex (they mirror the
// role tokens in app/globals.css).
const BRAND = "#6E1A2C";
const INK = "#4A0F1D";
const MUTED = "#75505A";
const LINE = "#ECDFE2";
const SURFACE = "#F8F1F3";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";

export type EmailRow = { label: string; value: string | string[] };

export type MessageEmailProps = {
  // Inbox preview line.
  preview: string;
  heading: string;
  paragraphs: string[];
  rows?: EmailRow[];
  button?: { label: string; href: string };
  // Extra links under the button, e.g. a map link.
  links?: { label: string; href: string }[];
  footer: string[];
};

export function MessageEmail({
  preview,
  heading,
  paragraphs,
  rows = [],
  button,
  links = [],
  footer,
}: MessageEmailProps) {
  return (
    <Html lang="en-GB">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: SURFACE, fontFamily: SANS }}>
        <Container
          style={{ maxWidth: 560, margin: "0 auto", backgroundColor: "#FFFFFF" }}
        >
          <Section style={{ backgroundColor: BRAND, padding: "20px 28px" }}>
            <Text
              style={{
                margin: 0,
                color: "#FFFFFF",
                fontFamily: SERIF,
                fontSize: 22,
                letterSpacing: 1,
              }}
            >
              Truly Locked In
            </Text>
          </Section>

          <Section style={{ padding: "28px 28px 8px" }}>
            <Heading
              as="h1"
              style={{
                margin: "0 0 16px",
                color: INK,
                fontFamily: SERIF,
                fontSize: 28,
                fontWeight: 600,
                lineHeight: "1.2",
              }}
            >
              {heading}
            </Heading>
            {paragraphs.map((paragraph, i) => (
              <Text
                key={i}
                style={{ margin: "0 0 12px", color: INK, fontSize: 15, lineHeight: "1.6" }}
              >
                {paragraph}
              </Text>
            ))}
          </Section>

          {rows.length > 0 && (
            <Section style={{ padding: "8px 28px" }}>
              {rows.map((row) => (
                <Row key={row.label} style={{ borderTop: `1px solid ${LINE}` }}>
                  <Column
                    style={{
                      width: "34%",
                      padding: "10px 12px 10px 0",
                      verticalAlign: "top",
                      color: MUTED,
                      fontSize: 13,
                    }}
                  >
                    {row.label}
                  </Column>
                  <Column
                    style={{
                      padding: "10px 0",
                      verticalAlign: "top",
                      color: INK,
                      fontSize: 15,
                      lineHeight: "1.5",
                    }}
                  >
                    {(Array.isArray(row.value) ? row.value : [row.value]).map(
                      (line, i) => (
                        <div key={i}>{line}</div>
                      ),
                    )}
                  </Column>
                </Row>
              ))}
              <Hr style={{ margin: 0, borderColor: LINE }} />
            </Section>
          )}

          {(button || links.length > 0) && (
            <Section style={{ padding: "16px 28px 8px" }}>
              {button && (
                <Button
                  href={button.href}
                  style={{
                    backgroundColor: BRAND,
                    color: "#FFFFFF",
                    borderRadius: 999,
                    padding: "12px 24px",
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {button.label}
                </Button>
              )}
              {links.map((link) => (
                <Text key={link.href} style={{ margin: "14px 0 0", fontSize: 14 }}>
                  <Link href={link.href} style={{ color: BRAND }}>
                    {link.label}
                  </Link>
                </Text>
              ))}
            </Section>
          )}

          <Section style={{ padding: "24px 28px 28px" }}>
            {footer.map((line, i) => (
              <Text
                key={i}
                style={{ margin: "0 0 4px", color: MUTED, fontSize: 13, lineHeight: "1.5" }}
              >
                {line}
              </Text>
            ))}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
