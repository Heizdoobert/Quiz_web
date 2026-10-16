import 'package:flutter/material.dart';

/// Placeholder screen used after sign‑up to collect a username.
/// It displays a simple message; the real app can replace it with a full implementation.
class AddUsernameScreen extends StatelessWidget {
  const AddUsernameScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Username')),
      body: const Center(
        child: Text('Add your username here', style: TextStyle(fontSize: 18)),
      ),
    );
  }
}
