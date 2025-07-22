'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type RequiredData = {
  No: number;
  company_url: string;
  company_traffic: number;
  company_organic_keywords: number;
  competitor_name: string;
  competitor_traffic: number;
  competitor_organic_keywords: number;
};

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [columnData, setColumnData] = useState<string[]>([]);
  const [requiredData, setRequiredData] = useState<RequiredData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setRequiredData([]);
    setColumnData([]);
    setShowDownload(false);
  };

  const handleUploadClick = () => {
    if (!file) {
      alert('Please select a file.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        complete: (result: any) => {
          const data: any[][] = result.data;
          const domains = data
            .slice(1)
            .map((row) => row[3]?.trim())
            .filter((val: string) => val && typeof val === 'string' && val.includes('.'));
          setColumnData(domains);
        },
        error: (err) => {
          alert('Error parsing CSV: ' + err.message);
        },
      });
    } else if (ext === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const domains = rows
          .slice(1)
          .map((row) => row[3]?.toString().trim())
          .filter((val: string) => val && typeof val === 'string' && val.includes('.'));
        setColumnData(domains);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file format. Please upload a .csv or .xlsx file.');
    }
  };

  useEffect(() => {
    if (!columnData.length) return;

    const fetchSpyFuData = async () => {
      setLoading(true);

      try {
        const results = await Promise.all(
          columnData.map(async (domain, index) => {
            try {
              const [mainMetricsRes, competitorsRes] = await Promise.all([
                fetch(`/api/getMetrics?domain=${encodeURIComponent(domain)}`),
                fetch(`/api/getCompetitors?domain=${encodeURIComponent(domain)}`)
              ]);
              const mainMetrics = await mainMetricsRes.json();
              const competitors = await competitorsRes.json();
              const mainResult = mainMetrics?.results?.[0] ?? {};
              let competitorName = '';
              let compResult = null;

              // if (Array.isArray(competitors) && competitors[0]?.domainName) {
                competitorName = competitors[1]?.domainName ;

                const compMetricsRes = await fetch(
                  `/api/getMetrics?domain=${encodeURIComponent(competitorName)}`
                );
                const compMetrics = await compMetricsRes.json();
                compResult = compMetrics?.results?.[0] ?? null;
              // }

              return {
                No: index + 1,
                company_url: domain,
                company_traffic: mainResult?.monthlyOrganicClicks ?? 0,
                company_organic_keywords: mainResult?.totalOrganicResults ?? 0,
                competitor_name: competitors[1]?.domainName  ?? '',
                competitor_traffic: compResult?.monthlyOrganicClicks ?? 0,
                competitor_organic_keywords: compResult?.totalOrganicResults ?? 0,
              };
            } catch (e) {
              console.error(`❌ Failed to fetch data for ${domain}`, e);
              return {
                No: index + 1,
                company_url: domain,
                company_traffic: 0,
                company_organic_keywords: 0,
                competitor_name: '',
                competitor_traffic: 0,
                competitor_organic_keywords: 0,
              };
            }
          })
        );

        setRequiredData(results);
        setShowDownload(true);
      } catch (error) {
        console.error(' Error in batch fetch:', error);
        alert('An error occurred while processing domains.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpyFuData();
  }, [columnData]);

  const downloadCSV = () => {
    if (!requiredData.length) return;

    const headers = Object.keys(requiredData[0]);
    const csvRows = [
      headers.join(','),
      ...requiredData.map(row =>
        headers.map(header => `"${(row as any)[header] ?? ''}"`).join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spyfu_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 24, background: '#f9f9f9', borderRadius: 8 }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}> SpyFu Domain Checker</h1>

      <div>
        <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={handleUploadClick}
          disabled={!file}
          style={{
            padding: '10px 20px',
            marginRight: 10,
            backgroundColor: '#1767ef',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
        >
           Upload & Start
        </button>

        {showDownload && (
          <button
            onClick={downloadCSV}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
           Download CSV
          </button>
        )}
      </div>

      {loading && <p style={{ marginTop: 20 }}>⏳ Processing... Please wait.</p>}

      {!loading && requiredData.length > 0 && (
        <div style={{ marginTop: 30, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {Object.keys(requiredData[0]).map((key) => (
                  <th
                    key={key}
                    style={{
                      borderBottom: '1px solid #ccc',
                      textAlign: 'left',
                      padding: '10px',
                      backgroundColor: '#eee',
                    }}
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requiredData.map((row, idx) => (
                <tr key={idx}>
                  {Object.values(row).map((val, i) => (
                    <td key={i} style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                      {val?.toString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
