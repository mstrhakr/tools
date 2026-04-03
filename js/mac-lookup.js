(function () {
  'use strict';

  // Common OUI prefixes - local fallback database
  // Source: IEEE OUI registry (most common vendors)
  var OUI_DB = {
    '000C29': 'VMware',
    '005056': 'VMware',
    '000569': 'VMware',
    '001C42': 'Parallels',
    '0003FF': 'Microsoft (Hyper-V)',
    '00155D': 'Microsoft (Hyper-V)',
    '080027': 'Oracle VirtualBox',
    '0A0027': 'Oracle VirtualBox',
    '525400': 'QEMU/KVM',
    '001A11': 'Google',
    '3C5AB4': 'Google',
    'A47733': 'Google',
    '94EB2C': 'Google',
    'F4F5D8': 'Google',
    'F4F5E8': 'Google',
    '54BF64': 'Dell',
    '002564': 'Dell',
    '00188B': 'Dell',
    '001422': 'Dell',
    '0021709': 'Dell',
    'F8DB88': 'Dell',
    'F48E38': 'Dell',
    '34E6D7': 'Dell',
    '842B2B': 'Dell',
    'B083FE': 'Dell',
    'B8CA3A': 'Dell',
    'E4F0042': 'Dell',
    '3C2C30': 'Dell',
    '18A99B': 'Dell',
    'D89EF3': 'Dell',
    '000D56': 'Dell',
    '00C04F': 'Dell',
    '001E4F': 'Dell',
    'A4BADB': 'Dell',
    '3417EB': 'Dell',
    '5CF9DD': 'Dell',
    '3C7C3F': 'ASUSTek',
    '0002E3': 'Cisco',
    '000E38': 'Cisco',
    '0050E2': 'Cisco',
    '0007B4': 'Cisco',
    '001B0D': 'Cisco',
    '0024F7': 'Cisco (Linksys)',
    '002191': 'Cisco (Linksys)',
    '001EE5': 'Cisco (Linksys)',
    '001217': 'Cisco (Linksys)',
    '68A3C4': 'Liteon (WiFi module)',
    '000347': 'Intel',
    '001111': 'Intel',
    '001320': 'Intel',
    '0016EA': 'Intel',
    '001CC0': 'Intel',
    '001DE0': 'Intel',
    '002314': 'Intel',
    '8086F2': 'Intel',
    '000E35': 'Intel',
    'F81654': 'Intel',
    '4CEB42': 'Intel',
    '54BF64': 'Dell',
    '3C970E': 'Intel',
    '0021CC': 'Apple',
    '000A95': 'Apple',
    '000D93': 'Apple',
    '0017F2': 'Apple',
    '0019E3': 'Apple',
    '001CB3': 'Apple',
    '001D4F': 'Apple',
    '001E52': 'Apple',
    '001FF3': 'Apple',
    '0021E9': 'Apple',
    '0022FA': 'Apple',
    '002332': 'Apple',
    '00236C': 'Apple',
    '0023DF': 'Apple',
    '002436': 'Apple',
    '002500': 'Apple',
    '002608': 'Apple',
    '0026BB': 'Apple',
    '28E02C': 'Apple',
    '3C15C2': 'Apple',
    '40A6D9': 'Apple',
    '440010': 'Apple',
    '54724F': 'Apple',
    '58B035': 'Apple',
    '60FACD': 'Apple',
    '70CD60': 'Apple',
    '7831C1': 'Apple',
    '7CC537': 'Apple',
    '7CF05F': 'Apple',
    '80E650': 'Apple',
    '84788B': 'Apple',
    '848506': 'Apple',
    '88E87F': 'Apple',
    '8C2DAA': 'Apple',
    'A860B6': 'Apple',
    'ACFDEC': 'Apple',
    'B8C75D': 'Apple',
    'B8E856': 'Apple',
    'BC3BAF': 'Apple',
    'C42C03': 'Apple',
    'C82A14': 'Apple',
    'C8E0EB': 'Apple',
    'D0E140': 'Apple',
    'D83062': 'Apple',
    'D89695': 'Apple',
    'DC2B61': 'Apple',
    'E06678': 'Apple',
    'E0F847': 'Apple',
    'E4CE8F': 'Apple',
    'F0B479': 'Apple',
    'F0D1A9': 'Apple',
    'F431C3': 'Apple',
    'F81EDF': 'Apple',
    '6C709F': 'Apple',
    '0050C2': 'IEEE (DOCSIS modems)',
    '001122': 'Cimsys',
    '0024E8': 'Dell',
    '001DD8': 'Microsoft (Xbox)',
    '7CC2C6': 'Microsoft',
    '001C7B': 'Castlenet (Realtek)',
    'B827EB': 'Raspberry Pi',
    'DC2632': 'Raspberry Pi',
    'E45F01': 'Raspberry Pi',
    '2CCF67': 'Raspberry Pi',
    'D83ADD': 'Raspberry Pi',
    '000EC6': 'Asix',
    '907841': 'Intel',
    '48B02D': 'Nvidia',
    '0002B3': 'Intel',
    '001372': 'Dell',
    '848F69': 'Dell',
    'EC2E4E': 'Dell',
    '0050B6': 'Apple',
    'F0DCE2': 'Apple',
    '18AF61': 'Apple',
    '002241': 'Apple',
    '002312': 'Apple',
    'AC87A3': 'Apple',
    '2078F0': 'Xiaomi',
    '641793': 'Xiaomi',
    '0C1DAF': 'Xiaomi',
    '28E31F': 'Xiaomi',
    '7C1DD9': 'Xiaomi',
    '9C99A0': 'Xiaomi',
    '4CE676': 'TP-Link',
    '1008B1': 'TP-Link',
    '5C628B': 'TP-Link',
    'C025E9': 'TP-Link',
    '1062EB': 'TP-Link',
    'EC086B': 'TP-Link',
    '60E327': 'TP-Link',
    'A42BB0': 'TP-Link',
    'F0A731': 'TP-Link',
    'B0A7B9': 'Netgear',
    'C03F0E': 'Netgear',
    '204E7F': 'Netgear',
    '6CB0CE': 'Netgear',
    'A42305': 'Netgear',
    'E8FC28': 'Netgear',
    '001E58': 'D-Link',
    '0015E9': 'D-Link',
    '00179A': 'D-Link',
    '001B11': 'D-Link',
    '001CF0': 'D-Link',
    '1CAFF7': 'D-Link',
    '340804': 'D-Link',
    'ACF1DF': 'D-Link',
    'C4A81D': 'D-Link',
    '001E68': 'Quanta Computer',
    '40F02F': 'Liteon',
    '78DD08': 'Hon Hai (Foxconn)',
    '1C3E84': 'Hon Hai (Foxconn)',
    '0026C6': 'Hon Hai (Foxconn)',
    'C01885': 'Hon Hai (Foxconn)',
    '7C5CF8': 'Hon Hai (Foxconn)',
    '38D547': 'ASUSTek',
    '2CFDA1': 'ASUSTek',
    '6045CB': 'ASUSTek',
    '1C872C': 'ASUSTek',
    '708BCD': 'ASUSTek',
    'AC9E17': 'ASUSTek',
    'BCEE7B': 'ASUSTek',
    '08606E': 'ASUSTek',
    '001731': 'ASUSTek',
    'F46D04': 'ASUSTek',
    '485B39': 'ASUSTek',
    '247F20': 'Sagemcom',
    '3890A5': 'Samsung',
    '0007AB': 'Samsung',
    '000726': 'Samsung',
    '002339': 'Samsung',
    '5CA39D': 'Samsung',
    '78D6F0': 'Samsung',
    '8425DB': 'Samsung',
    '941882': 'Samsung',
    'A8F274': 'Samsung',
    'BCB1F3': 'Samsung',
    'C44619': 'Samsung',
    'CC07AB': 'Samsung',
    'D0176A': 'Samsung',
    'D0226E': 'Samsung',
    '000AEB': 'TP-Link',
    'C0A0BB': 'D-Link',
    'B0BE76': 'TP-Link',
    '14CC20': 'TP-Link',
    '5032B8': 'TP-Link',
    'AC84C6': 'TP-Link',
    '701A04': 'Liteon',
    '28EE52': 'TP-Link',
    'FCFBFB': 'Cisco',
    '74867A': 'Dell',
    '1418C3': 'Dell',
    'F8BC12': 'Dell',
    '0022B0': 'D-Link',
    '00265A': 'D-Link',
    '34298F': 'D-Link',
    '286ED4': 'D-Link',
    '803773': 'Netgear',
    'DC9FDB': 'Ubiquiti',
    '788A20': 'Ubiquiti',
    '0418D6': 'Ubiquiti',
    '2487ED': 'Ubiquiti',
    '44D9E7': 'Ubiquiti',
    '687251': 'Ubiquiti',
    '74ACB9': 'Ubiquiti',
    '802AA8': 'Ubiquiti',
    'B4FBE4': 'Ubiquiti',
    'E063DA': 'Ubiquiti',
    'F09FC2': 'Ubiquiti',
    'FCECDA': 'Ubiquiti',
    '18E829': 'Ubiquiti',
    '245A4C': 'Ubiquiti'
  };

  function normalizeMac(input) {
    // Strip separators and whitespace
    var cleaned = input.replace(/[:\-.\s]/g, '').toUpperCase();
    if (!/^[0-9A-F]{6,12}$/.test(cleaned)) return null;
    return cleaned.slice(0, 6);
  }

  function formatOUI(oui) {
    return oui.slice(0, 2) + ':' + oui.slice(2, 4) + ':' + oui.slice(4, 6);
  }

  function makeStatItem(label, value) {
    return '<div class="stat-item">' +
      '<div class="stat-value" style="font-size:1rem;word-break:break-all">' + (value || 'N/A') + '</div>' +
      '<div class="stat-label">' + label + '</div>' +
      '</div>';
  }

  function showError(msg) {
    var el = document.getElementById('mac-error');
    if (msg) {
      el.textContent = msg;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  function showResults(oui, vendor, inputMac, source) {
    var results = document.getElementById('mac-results');
    var html = '';
    html += makeStatItem('OUI Prefix', formatOUI(oui));
    html += makeStatItem('Vendor / Manufacturer', vendor);
    html += makeStatItem('Input MAC', inputMac.toUpperCase());
    html += makeStatItem('Source', source);
    results.innerHTML = html;
  }

  function lookup() {
    var input = document.getElementById('mac-input').value;
    var results = document.getElementById('mac-results');
    showError('');
    results.innerHTML = '';

    var oui = normalizeMac(input);
    if (!oui) {
      showError('Invalid MAC address format. Enter at least 6 hex characters.');
      return;
    }

    // Check local DB first
    if (OUI_DB[oui]) {
      showResults(oui, OUI_DB[oui], input, 'local database');
      return;
    }

    // Try maclookup.app API (CORS-enabled, free tier: 2 req/sec)
    results.innerHTML = '<div class="text-muted">Looking up...</div>';
    fetch('https://api.maclookup.app/v2/macs/' + formatOUI(oui))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.found === true && data.company) {
          showResults(oui, data.company, input, 'maclookup.app');
        } else {
          showError('OUI ' + formatOUI(oui) + ' not found in database');
        }
      })
      .catch(function () {
        showError('OUI ' + formatOUI(oui) + ' not in local database and API lookup failed. Try again later.');
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-lookup').addEventListener('click', lookup);
    document.getElementById('mac-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookup();
    });
  });
})();
