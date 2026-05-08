import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'flex-start',
  },
  card: {
    width: '30%',
    padding: 15,
    border: '1pt dashed #ccc',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000000',
  },
  qrImage: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
  }
});

export const DispenserQRPDF = ({ qrs }: { qrs: { id: string, qrDataUrl: string }[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {qrs.map((item, index) => (
        <View key={index} style={styles.card} wrap={false}>
          <Text style={styles.title}>{item.id}</Text>
          <Image src={item.qrDataUrl} style={styles.qrImage} />
          <Text style={styles.footerText}>HDB Service</Text>
        </View>
      ))}
    </Page>
  </Document>
);
