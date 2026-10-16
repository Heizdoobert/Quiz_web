import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:mobile/api/api_client.dart';
import 'package:mobile/theme/app_theme.dart';

/// A page on the website that serves this app's API. Play asks for both pages to be reachable
/// from inside the app.
Uri legalUrl(String path) => Uri.parse(ApiClient.baseUrl).resolve(path);

class LegalLinks extends StatelessWidget {
  const LegalLinks({super.key});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      children: [
        _link('Privacy policy', '/privacy'),
        _link('Delete your account', '/account-deletion'),
      ],
    );
  }

  Widget _link(String label, String path) => TextButton(
        onPressed: () => launchUrl(legalUrl(path), mode: LaunchMode.externalApplication),
        child: Text(label, style: const TextStyle(color: AppColors.slate400, fontSize: 12)),
      );
}
