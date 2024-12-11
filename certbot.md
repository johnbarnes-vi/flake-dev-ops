# Certbot SSL Certificate Management Guide

## Basic Certificate Commands

### Check Certificate Status
To view all your current certificates and their details:
```bash
certbot certificates
```

For more detailed information including paths and settings:
```bash
certbot certificates --verbose
```

### Creating New Certificates

Single domain:
```bash
certbot certonly -d example.com
```

Multiple domains:
```bash
certbot certonly \
    --cert-name multi-domain-cert \
    -d primary-domain.com \
    -d secondary-domain.com \
    -d third-domain.com
```

### Adding Domains to Existing Certificates

Use the `--expand` option to add new domains. You must include ALL existing domains:
```bash
certbot certonly --expand \
    -d existing-domain.com \
    -d new-domain.com \
    -d another-new-domain.com
```

### Renewal Commands

Auto-renew all certificates:
```bash
certbot renew
```

Renew specific certificate:
```bash
certbot renew --cert-name your-cert-name
```

Force renewal (even if not near expiration):
```bash
certbot renew --force-renewal --cert-name your-cert-name
```

### Delete Certificates
```bash
certbot delete --cert-name your-cert-name
```

## Important Notes

1. **Domain Limits**
   - Maximum 100 domains per certificate
   - First domain listed becomes the primary domain
   - All domains must validate successfully

2. **Validation Methods**
   - HTTP-01 challenge (default)
   - DNS-01 challenge (required for wildcard certificates)

3. **Common Issues**
   - Ensure proper DNS configuration
   - Check port 80/443 availability
   - Verify webroot permissions
   - Monitor certificate expiration dates

4. **Best Practices**
   - Keep regular backups of certificates
   - Set up automated renewal
   - Monitor renewal logs
   - Test renewal process periodically

## Certificate Locations

Common certificate locations on Linux systems:
- Certificates: `/etc/letsencrypt/live/domain.com/`
- Archive: `/etc/letsencrypt/archive/domain.com/`
- Renewal configs: `/etc/letsencrypt/renewal/domain.com.conf`

## Example Workflow

1. **Initial Certificate Setup**
```bash
# Create initial certificate
certbot certonly -d example.com

# Verify creation
certbot certificates
```

2. **Adding New Domain**
```bash
# Check current certificate
certbot certificates

# Add new domain
certbot certonly --expand -d example.com -d new.example.com

# Verify changes
certbot certificates --verbose
```

3. **Regular Maintenance**
```bash
# Test renewal process
certbot renew --dry-run

# Check certificate status
certbot certificates

# Force renewal if needed
certbot renew --force-renewal
```

## Useful Parameters

- `--dry-run`: Test commands without making changes
- `--verbose`: Show detailed output
- `--quiet`: Minimize output
- `--nginx`: Use NGINX plugin
- `--apache`: Use Apache plugin
- `--webroot`: Use webroot plugin
- `--standalone`: Use standalone web server