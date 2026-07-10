import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { FieldSummaryEntry } from "./template";

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 24,
  },
  paragraph: {
    marginBottom: 12,
    textAlign: "justify",
  },
  summaryBlock: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 12,
  },
  summaryHeading: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  summaryLabel: {
    width: "45%",
  },
  summaryValue: {
    width: "55%",
  },
});

interface PdfDocumentProps {
  title: string;
  paragraphs: string[];
  fieldSummary: FieldSummaryEntry[];
}

export function PdfDocument({ title, paragraphs, fieldSummary }: PdfDocumentProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryHeading}>Prepared For</Text>
          {fieldSummary.map((entry, index) => (
            <View key={index} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{entry.label}</Text>
              <Text style={styles.summaryValue}>{entry.value}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
