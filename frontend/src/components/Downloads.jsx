import React, { useState, useEffect } from 'react';
import { FileDown, CheckCircle, AlertTriangle, Play, Settings, Plus, Star, Trash2 } from 'lucide-react';

export default function Downloads() {
  const [versions, setVersions] = useState([]);
  const [newVersion, setNewVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isStable, setIsStable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const response = await fetch('/api/admin/versions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setVersions(data || []);
    } catch (err) {
      console.error('Error fetching versions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVersion = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const response = await fetch('/api/admin/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ version: newVersion, downloadUrl, isStable })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to release version');
      }

      setNewVersion('');
      setDownloadUrl('');
      setIsStable(false);
      await fetchVersions();
      alert('Version released successfully');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMakeStable = async (version) => {
    if (!window.confirm(`Promote version v${version} to the STABLE channel? All older agents will check for updates and attempt to auto-upgrade to this release.`)) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/versions/${version}/stable`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to promote version');
      await fetchVersions();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDeprecate = async (version, isCurrentlyDeprecated) => {
    const actionText = isCurrentlyDeprecated ? 'Restore' : 'Deprecate';
    if (!window.confirm(`${actionText} version v${version}?`)) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/versions/${version}/deprecate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isDeprecated: !isCurrentlyDeprecated })
      });

      if (!response.ok) throw new Error('Failed to toggle deprecation');
      await fetchVersions();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (version) => {
    if (!window.confirm(`Delete version release v${version}? This will permanently remove its download link.`)) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/versions/${version}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to delete version');
      await fetchVersions();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const stableVersionObj = versions.find(v => v.isStable);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">Release Management</h2>
        <p className="text-sm text-slate-400 mt-1">Manage installer build paths, deploy stable version rollouts, and deprecate older builds</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload New Release */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-5">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Register New Build Release</span>
            </h3>

            <form onSubmit={handleAddVersion} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Version String (SemVer)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.3.4"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Installer Download URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-3 bg-slate-900/20 p-3 rounded-xl border border-slate-900/50">
                <input
                  type="checkbox"
                  id="isStable"
                  checked={isStable}
                  onChange={(e) => setIsStable(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                />
                <label htmlFor="isStable" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Promote directly to Stable Release
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Publish New Build
              </button>
            </form>
          </div>

          {/* Stable details */}
          <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-900 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="font-semibold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 text-sm mb-4">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>Active Stable Channel</span>
            </h3>

            {stableVersionObj ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-xl">
                  <span className="font-bold text-sm text-yellow-400 font-mono">v{stableVersionObj.version}</span>
                  <span className="text-[10px] text-slate-500">{new Date(stableVersionObj.releaseDate).toLocaleDateString()}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Adoption Count:</span>
                    <span className="text-slate-200 font-semibold">{stableVersionObj.installedCount} devices</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pending Upgrade:</span>
                    <span className="text-yellow-400 font-semibold">{stableVersionObj.pendingUpdateCount} devices</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-900">
                  <span className="text-slate-500 block mb-1">Download Link:</span>
                  <a href={stableVersionObj.downloadUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-mono truncate block max-w-full">
                    {stableVersionObj.downloadUrl}
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500 py-4">No version has been marked as stable yet.</p>
            )}
          </div>
        </div>

        {/* Right Column: Versions History & Rollouts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading version history...</div>
            ) : versions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No versions registered.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/60">
                      <th className="px-6 py-4">Version</th>
                      <th className="px-6 py-4">Release Date</th>
                      <th className="px-6 py-4 text-center">Adopted</th>
                      <th className="px-6 py-4 text-center">Update Pending</th>
                      <th className="px-6 py-4 text-center">Channel</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-sm text-slate-300">
                    {versions.map((v) => (
                      <tr key={v._id} className={`hover:bg-slate-900/10 transition-colors ${v.isDeprecated ? 'opacity-50' : ''}`}>
                        {/* Version */}
                        <td className="px-6 py-4 font-mono font-semibold text-slate-200 flex items-center space-x-2">
                          <span>v{v.version}</span>
                          {v.isDeprecated && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 uppercase font-semibold">
                              Deprecated
                            </span>
                          )}
                        </td>

                        {/* Release Date */}
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(v.releaseDate).toLocaleString()}
                        </td>

                        {/* Adopted Count */}
                        <td className="px-6 py-4 text-center font-semibold text-slate-200">{v.installedCount || 0}</td>

                        {/* Pending Count */}
                        <td className="px-6 py-4 text-center font-semibold text-yellow-400">{v.pendingUpdateCount || 0}</td>

                        {/* Channel status */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            {v.isStable ? (
                              <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase tracking-wide">
                                <Star className="w-3 h-3 fill-yellow-400" />
                                <span>Stable</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-500 border border-slate-800 uppercase tracking-wide">
                                Beta
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {!v.isStable && (
                              <button
                                onClick={() => handleMakeStable(v.version)}
                                disabled={actionLoading}
                                title="Promote to Stable"
                                className="p-1.5 bg-slate-900 hover:bg-yellow-500/10 border border-slate-800 hover:border-yellow-500/20 rounded text-slate-400 hover:text-yellow-400 transition-colors"
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleDeprecate(v.version, v.isDeprecated)}
                              disabled={actionLoading}
                              title={v.isDeprecated ? 'Restore Release' : 'Deprecate Release'}
                              className="p-1.5 bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.version)}
                              disabled={actionLoading || v.isStable}
                              title="Delete Release"
                              className="p-1.5 bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
