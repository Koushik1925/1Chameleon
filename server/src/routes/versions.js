const express = require('express');
const router = express.Router();
const Version = require('../models/Version');
const Log = require('../models/Log');
const adminAuth = require('../middleware/adminAuth');

router.use(adminAuth);

// 1. Get all versions
router.get('/', async (req, res) => {
  try {
    const versions = await Version.find().sort({ releaseDate: -1 });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add a new version release
router.post('/', async (req, res) => {
  const { version, downloadUrl, isStable } = req.body;

  if (!version || !downloadUrl) {
    return res.status(400).json({ error: 'Version and downloadUrl are required' });
  }

  try {
    let existingVersion = await Version.findOne({ version });
    if (existingVersion) {
      return res.status(400).json({ error: `Version ${version} already exists` });
    }

    if (isStable) {
      // Mark all other versions as not stable
      await Version.updateMany({}, { isStable: false });
    }

    const newVersion = await Version.create({
      version,
      downloadUrl,
      isStable: !!isStable
    });

    await Log.create({
      eventType: 'Version Released',
      description: `New version release added: v${version}. Stable: ${!!isStable}`,
      severity: 'info'
    });

    res.status(201).json(newVersion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Mark version as stable
router.post('/:version/stable', async (req, res) => {
  try {
    const targetVersion = await Version.findOne({ version: req.params.version });
    if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

    // Remove stable flag from all other versions
    await Version.updateMany({}, { isStable: false });

    // Mark this one as stable
    targetVersion.isStable = true;
    await targetVersion.save();

    await Log.create({
      eventType: 'Version Promoted to Stable',
      description: `Version v${req.params.version} was promoted to stable.`,
      severity: 'warning'
    });

    res.json({ message: `Version v${req.params.version} is now marked as stable`, version: targetVersion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Toggle deprecation status
router.post('/:version/deprecate', async (req, res) => {
  const { isDeprecated } = req.body;

  try {
    const targetVersion = await Version.findOne({ version: req.params.version });
    if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

    targetVersion.isDeprecated = isDeprecated !== undefined ? !!isDeprecated : !targetVersion.isDeprecated;
    await targetVersion.save();

    await Log.create({
      eventType: 'Version Deprecation Toggled',
      description: `Version v${req.params.version} deprecation status updated to: ${targetVersion.isDeprecated}`,
      severity: 'info'
    });

    res.json({ message: `Version v${req.params.version} deprecation toggled successfully`, version: targetVersion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete version release
router.delete('/:version', async (req, res) => {
  try {
    const result = await Version.findOneAndDelete({ version: req.params.version });
    if (!result) return res.status(404).json({ error: 'Version not found' });

    await Log.create({
      eventType: 'Version Deleted',
      description: `Version v${req.params.version} was removed from downloads.`,
      severity: 'info'
    });

    res.json({ message: `Version v${req.params.version} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
