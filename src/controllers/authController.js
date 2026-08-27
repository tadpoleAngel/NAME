import { generateToken, getGoogleConfig, isGoogleConfigured } from '../config/auth.js';
import { getConnection } from '../config/database.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // For demo purposes, allow login with just email (no password check)
    // In production, you'd verify password hash here
    const connection = getConnection();
    const userResult = await connection.runAndReadAll(
      `SELECT * FROM main.users WHERE email='${email}'`
    );
    const user = userResult.getRowObjects()[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ 
      userId: user.id, 
      email: user.email,
      tenantId: user.tenant_id 
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        tenant_id: user.tenant_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function getGoogleAuthUrl(req, res) {
  if (!isGoogleConfigured()) {
    return res.status(501).json({ error: 'Google SSO not configured' });
  }

  const config = getGoogleConfig();
  const redirectUri = encodeURIComponent(config.callbackURL);
  const scope = encodeURIComponent('profile email');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  res.json({ authUrl });
}

export async function handleGoogleCallback(req, res) {
  // This is a placeholder for Google SSO implementation
  // In a real implementation, you would:
  // 1. Exchange the authorization code for an access token
  // 2. Use the access token to get user info from Google
  // 3. Find or create the user in your database
  // 4. Generate a JWT token for the user
  
  res.status(501).json({ error: 'Google SSO callback not yet implemented' });
}

export async function getCurrentUser(req, res) {
  // The user is already attached to req.user by the authenticate middleware
  res.json({
    id: req.user.id,
    email: req.user.email,
    display_name: req.user.display_name,
    role: req.user.role,
    tenant_id: req.user.tenant_id
  });
}