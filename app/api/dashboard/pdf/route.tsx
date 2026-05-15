import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { marginBottom: 30, borderBottom: '2px solid #0ea5e9', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 5 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
  text: { fontSize: 10, color: '#334155', lineHeight: 1.5, marginBottom: 5 },
  card: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 5, marginBottom: 10 },
  metricValue: { fontSize: 20, fontWeight: 'bold', color: '#0ea5e9' },
  metricLabel: { fontSize: 10, color: '#64748b', textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 15 },
  col: { flex: 1 },
});

const ReportPDF = ({ type, filters, data }: { type: string; filters: any; data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Reporte de {type === 'performance' ? 'Performance Operativa' : 'Salud del Parque'}
        </Text>
        <Text style={styles.subtitle}>Generado el {new Date().toLocaleDateString()}</Text>
        <Text style={styles.subtitle}>
          Filtros Aplicados: 
          {filters?.clientId ? ` Cliente: ${filters.clientId} |` : ' Todos los Clientes |'}
          {filters?.plantId ? ` Planta: ${filters.plantId} |` : ' Todas las Plantas |'}
          {filters?.failureName ? ` Falla: ${filters.failureName}` : ''}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Métricas Actuales</Text>
        {type === 'performance' && data?.kpis ? (
          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.metricLabel}>SLA Promedio</Text>
                <Text style={styles.metricValue}>{data.kpis.sla} hrs</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.metricLabel}>MTTR Promedio</Text>
                <Text style={styles.metricValue}>{data.kpis.mttr} hrs</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.metricLabel}>MTBF Promedio</Text>
                <Text style={styles.metricValue}>{data.kpis.mtbf} días</Text>
              </View>
            </View>
          </View>
        ) : type === 'salud' && data?.distribution ? (
          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.metricLabel}>Óptimos</Text>
                <Text style={[styles.metricValue, { color: '#10b981' }]}>{data.distribution.optimo}</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.metricLabel}>Estables</Text>
                <Text style={[styles.metricValue, { color: '#f59e0b' }]}>{data.distribution.estable}</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.card}>
                <Text style={styles.metricLabel}>Críticos</Text>
                <Text style={[styles.metricValue, { color: '#ef4444' }]}>{data.distribution.critico}</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.text}>No hay datos para mostrar.</Text>
        )}
      </View>

      {type === 'salud' && data?.ranking && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ranking de Dispensers</Text>
          {data.ranking.slice(0, 10).map((h: any, i: number) => (
            <View key={h.id} style={[styles.row, { borderBottom: '1px solid #e2e8f0', paddingVertical: 5, marginBottom: 5 }]}>
              <View style={{ width: '10%' }}><Text style={styles.text}>{i + 1}</Text></View>
              <View style={{ width: '30%' }}><Text style={styles.text}>{h.id}</Text></View>
              <View style={{ width: '20%' }}><Text style={styles.text}>Score: {h.score}</Text></View>
              <View style={{ width: '20%' }}><Text style={styles.text}>Estado: {h.status}</Text></View>
              <View style={{ width: '20%' }}>
                <Text style={styles.text}>MTBF: {h.details?.mtbfDays || 0}d</Text>
              </View>
            </View>
          ))}
          {data.ranking.length > 10 && (
            <Text style={[styles.text, { marginTop: 10 }]}>...y {data.ranking.length - 10} equipos más (ver plataforma).</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Definición de Métricas</Text>
        <View style={styles.card}>
          <Text style={styles.metricLabel}>SLA (Service Level Agreement)</Text>
          <Text style={styles.text}>Mide el tiempo de respuesta promedio (en horas) desde que se reporta una falla hasta que el técnico inicia la atención.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.metricLabel}>MTTR (Mean Time To Repair)</Text>
          <Text style={styles.text}>Mide el tiempo promedio total (en horas) que toma resolver completamente una incidencia desde su creación.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.metricLabel}>MTBF (Mean Time Between Failures)</Text>
          <Text style={styles.text}>Mide el tiempo promedio que transcurre entre fallas reportadas para un mismo equipo. Un MTBF mayor indica mayor confiabilidad.</Text>
        </View>
        {type === 'salud' && (
          <View style={styles.card}>
            <Text style={styles.metricLabel}>Score de Salud</Text>
            <Text style={styles.text}>Algoritmo compuesto que pondera el MTBF (40%), el MTTR (20%), la reincidencia (20%), la condición general inspeccionada (10%) y el avance de vida útil teórica (10%).</Text>
          </View>
        )}
      </View>
    </Page>
  </Document>
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, filters, data } = body;

    const stream = await renderToStream(<ReportPDF type={type} filters={filters} data={data} />);
    
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_${type}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new NextResponse('Error generating PDF', { status: 500 });
  }
}
