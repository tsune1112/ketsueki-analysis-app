import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [inputValues, setInputValues] = useState({});

  const API_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8888';

  const HEALTH_STANDARDS_KEYS = [
    "ヘモグロビン", "総コレステロール", "HDLコレステロール", "LDLコレステロール",
    "中性脂肪", "AST", "ALT", "γ-GTP"
  ];

  const handleInputChange = (item, value) => {
    setInputValues(prev => ({ ...prev, [item]: value }));
  };

  const onAnalyzeDirect = () => {
    const dataToSend = {};
    for (const key of HEALTH_STANDARDS_KEYS) {
      if (inputValues[key]) {
        dataToSend[key] = parseFloat(inputValues[key]);
      }
    }

    if (Object.keys(dataToSend).length === 0) {
      setMessage('少なくとも1つの項目を入力してください。');
      return;
    }

    setMessage('データを分析中...');
    setIsLoading(true);
    setAnalysisResult(null);
    setError('');

    axios.post(`${API_URL}/.netlify/functions/main/analyze_direct`, { data: dataToSend })
      .then((res) => {
        if (res.data.error) {
          setError(res.data.error);
          setAnalysisResult(null);
        } else {
          setAnalysisResult(res.data);
          setMessage('分析が完了しました。');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('分析中にエラーが発生しました。');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '高い':
        return 'text-danger';
      case '低い':
        return 'text-warning';
      default:
        return 'text-success';
    }
  };

  return (
    <div className="container mt-5">
      <header className="text-center mb-5">
        <h1>&#x1FA78; 血液データ分析＆健康アドバイス &#x1F331;</h1>
        <p className="lead">以下の項目に数値を入力して分析を開始してください。</p>
      </header>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title">1. 血液データを入力</h5>
          <div className="row">
            {Object.keys(HEALTH_STANDARDS).map((item) => (
              <div className="col-md-4 mb-3" key={item}>
                <label htmlFor={item} className="form-label">{item}</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  id={item}
                  value={inputValues[item] || ''}
                  onChange={(e) => handleInputChange(item, e.target.value)}
                />
              </div>
            ))}
          </div>
          <button className="btn btn-primary mt-3" onClick={onAnalyzeDirect} disabled={isLoading}>
            {isLoading ? '分析中...' : '分析スタート'}
          </button>
          {error && <div className="alert alert-danger mt-3">{error}</div>}
          {message && <div className="alert alert-info mt-3">{message}</div>}
        </div>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center my-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {analysisResult && (
        <div>
          <div className="card shadow-sm mb-4">
            <div className="card-header"><h5>&#x1F4DD; 分析結果</h5></div>
            <div className="card-body">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>項目</th>
                    <th>あなたの結果</th>
                    <th>基準値</th>
                    <th>評価</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult.analysis.map((item, index) => (
                    <tr key={index}>
                      <td>{item.項目}</td>
                      <td>{item.結果}</td>
                      <td>{item.基準値}</td>
                      <td><span className={`fw-bold ${getStatusColor(item.評価)}`}>{item.評価}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {Object.keys(analysisResult.recommendations).length > 0 && (
             <div className="card shadow-sm">
                <div className="card-header"><h5>&#x1F344; おすすめの栄養素と食材</h5></div>
                <div className="card-body">
                  {Object.entries(analysisResult.recommendations).map(([nutrient, foods]) => (
                    <div key={nutrient} className="mb-3">
                      <h6>{nutrient}を多く含む食材</h6>
                      <p>{foods.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
          )}
        </div>
      )}

      <footer className="text-center text-muted mt-5">
        <p><small>本アプリケーションは健康に関する情報提供を目的としており、医師の診断に代わるものではありません。</small></p>
      </footer>
    </div>
  );
}

export default App;