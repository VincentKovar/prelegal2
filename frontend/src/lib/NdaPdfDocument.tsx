import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { buildNdaParagraphs, NdaFormData } from "./nda";

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
  signatureBlock: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureColumn: {
    width: "45%",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000",
    marginTop: 32,
    paddingTop: 4,
  },
});

export function NdaPdfDocument({ data }: { data: NdaFormData }) {
  const paragraphs = buildNdaParagraphs(data);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>MUTUAL NON-DISCLOSURE AGREEMENT</Text>
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLine}>
              {data.partyAName.trim() || "Party A"} — Signature / Date
            </Text>
          </View>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLine}>
              {data.partyBName.trim() || "Party B"} — Signature / Date
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
