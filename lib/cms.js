const OWNER = 'Thomastigre-ux';
const REPO = 'nonna-mery-trattoria';
const BRANCH = 'main';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;

  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD || '';
}

function githubToken() {
  return process.env.GITHUB_TOKEN || '';
}

function isConfigured() {
  return Boolean(adminPassword() && githubToken());
}

function verifyPassword(password) {
  return Boolean(password) && password === adminPassword();
}

async function gh(path, options = {}) {
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/${path}`,
    {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${githubToken()}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    }
  );

  const text = await r.text();

  let data = {};

  try {
    data = JSON.parse(text);
  } catch {}

  if (!r.ok) {
    throw new Error(data.message || `GitHub API ${r.status}`);
  }

  return data;
}

async function readJsonFile(path) {
  const file = await gh(
    `contents/${path}?ref=${BRANCH}&t=${Date.now()}`
  );

  const decoded = Buffer
    .from(
      file.content.replace(/\n/g, ''),
      'base64'
    )
    .toString('utf8');

  return {
    data: JSON.parse(decoded),
    sha: file.sha
  };
}

async function writeJsonFile(path, value, message) {
  let lastError;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      let sha;

      try {
        const existing = await gh(
          `contents/${path}?ref=${BRANCH}&t=${Date.now()}`
        );

        sha = existing.sha;
      } catch {}

      const body = {
        message,
        content: Buffer
          .from(
            JSON.stringify(value, null, 2),
            'utf8'
          )
          .toString('base64'),

        branch: BRANCH
      };

      if (sha) {
        body.sha = sha;
      }

      return await gh(
        `contents/${path}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

    } catch (err) {
      lastError = err;

      if (attempt < 3) {
        await new Promise(resolve =>
          setTimeout(
            resolve,
            500 + attempt * 500
          )
        );
      }
    }
  }

  throw lastError;
}

async function writeBinaryFile(path, buffer, message) {
  let lastError;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      let sha;

      try {
        const existing = await gh(
          `contents/${path}?ref=${BRANCH}&t=${Date.now()}`
        );

        sha = existing.sha;
      } catch {}

      const body = {
        message,
        content: buffer.toString('base64'),
        branch: BRANCH
      };

      if (sha) {
        body.sha = sha;
      }

      return await gh(
        `contents/${path}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

    } catch (err) {
      lastError = err;

      if (attempt < 3) {
        await new Promise(resolve =>
          setTimeout(
            resolve,
            500 + attempt * 500
          )
        );
      }
    }
  }

  throw lastError;
}

module.exports = {
  json,
  parseBody,
  verifyPassword,
  isConfigured,
  readJsonFile,
  writeJsonFile,
  writeBinaryFile
};
