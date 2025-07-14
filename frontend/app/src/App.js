import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [foodRecommendations, setFoodRecommendations] = useState(null);

  const onFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setAnalysisResult(null);
    setError('');
  };

  const API_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8888';

  const onFileUpload = () => {
    if (!selectedFile) {
      setMessage('ファイルを選択してください。');
      return;
    }
    setMessage('ファイルをアップロード中...');
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    axios.post(`${API_URL}/.netlify/functions/main/upload`, formData)
      .then((res) => {
        setAnalysisResult(res.data.analysis);
        setFoodRecommendations(res.data.recommendations);
        setMessage('アップロードと分析が完了しました。');
      })
      .catch((err) => {
        console.error(err);
        setMessage('ファイルのアップロード中にエラーが発生しました。');
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
        <p className="lead">健康診断の結果（CSVまたは画像ファイル）をアップロードしてください。</p>
      </header>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title">1. ファイルを選択</h5>
          <div className="input-group">
            <input type="file" className="form-control" onChange={onFileChange} accept=".csv,.png,.jpg,.jpeg,.pdf" />
            <button className="btn btn-primary" onClick={onFileUpload} disabled={isLoading}>
              {isLoading ? '分析中...' : '分析スタート'}
            </button>
          </div>
          {error && <div className="alert alert-danger mt-3">{error}</div>}
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