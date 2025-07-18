import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ModelVariant {
  _id: string;
  provider: string;
  model_id: string;
  enabled: boolean;
  created_at: string;
}

interface CanonicalModel {
  canonical_id: string;
  display_name: string;
  variants: ModelVariant[];
}

const Admin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [models, setModels] = useState<CanonicalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const adminKey = searchParams.get('key');

  useEffect(() => {
    if (!adminKey) {
      setError('Admin key required');
      setLoading(false);
      return;
    }
    fetchModels();
  }, [adminKey]);

  const fetchModels = async () => {
    try {
      // Call backend directly since frontend doesn't have API routes
      const backendUrl = window.location.protocol + '//' + window.location.hostname + ':15000';
      const response = await fetch(`${backendUrl}/api/admin-models?key=${adminKey}`);
      if (!response.ok) {
        const text = await response.text();
        if (text.includes('<!doctype') || text.includes('<html')) {
          throw new Error(`API route not found (got HTML instead of JSON)`);
        }
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      setModels(data.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (canonicalId: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(canonicalId)) {
      newExpanded.delete(canonicalId);
    } else {
      newExpanded.add(canonicalId);
    }
    setExpandedModels(newExpanded);
  };

  const startEditing = (canonicalId: string, currentName: string) => {
    setEditingModel(canonicalId);
    setEditValue(currentName);
  };

  const saveEdit = async (canonicalId: string) => {
    try {
      const backendUrl = window.location.protocol + '//' + window.location.hostname + ':15000';
      const response = await fetch(`${backendUrl}/api/admin-models/${canonicalId}?key=${adminKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: editValue })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      // Update local state
      setModels(models.map(model => 
        model.canonical_id === canonicalId 
          ? { ...model, display_name: editValue }
          : model
      ));
      
      setEditingModel(null);
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const cancelEdit = () => {
    setEditingModel(null);
    setEditValue('');
  };

  if (!adminKey) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Admin Panel</h1>
        <p>Access denied. Admin key required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Model Admin Panel</h1>
      <p>{models.length} canonical models</p>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ textAlign: 'left', padding: '10px' }}>Model</th>
            <th style={{ textAlign: 'left', padding: '10px' }}>Variants</th>
            <th style={{ textAlign: 'left', padding: '10px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {models.map(model => (
            <React.Fragment key={model.canonical_id}>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>
                  {editingModel === model.canonical_id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      style={{ width: '200px', padding: '5px' }}
                      autoFocus
                    />
                  ) : (
                    <strong>{model.display_name}</strong>
                  )}
                  <br />
                  <small style={{ color: '#666' }}>ID: {model.canonical_id}</small>
                </td>
                <td style={{ padding: '10px' }}>
                  {model.variants.length} providers
                </td>
                <td style={{ padding: '10px' }}>
                  {editingModel === model.canonical_id ? (
                    <>
                      <button 
                        onClick={() => saveEdit(model.canonical_id)}
                        style={{ marginRight: '5px', padding: '5px 10px' }}
                      >
                        Save
                      </button>
                      <button 
                        onClick={cancelEdit}
                        style={{ padding: '5px 10px' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => startEditing(model.canonical_id, model.display_name)}
                        style={{ marginRight: '5px', padding: '5px 10px' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => toggleExpanded(model.canonical_id)}
                        style={{ padding: '5px 10px' }}
                      >
                        {expandedModels.has(model.canonical_id) ? 'Collapse' : 'Expand'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
              
              {expandedModels.has(model.canonical_id) && (
                <tr>
                  <td colSpan={3} style={{ padding: '0 20px 10px 20px', backgroundColor: '#f9f9f9' }}>
                    <table style={{ width: '100%', fontSize: '0.9em' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '5px' }}>Provider</th>
                          <th style={{ textAlign: 'left', padding: '5px' }}>Model ID</th>
                          <th style={{ textAlign: 'left', padding: '5px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.variants.map(variant => (
                          <tr key={variant._id}>
                            <td style={{ padding: '5px' }}>{variant.provider}</td>
                            <td style={{ padding: '5px', fontFamily: 'monospace', fontSize: '0.8em' }}>
                              {variant.model_id}
                            </td>
                            <td style={{ padding: '5px' }}>
                              <span style={{ 
                                color: variant.enabled ? 'green' : 'red',
                                fontWeight: 'bold'
                              }}>
                                {variant.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;