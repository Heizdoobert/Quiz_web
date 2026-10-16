import 'package:flutter/material.dart';

/// Simple placeholder screen for adding a username.
class AddUsernameScreen extends StatelessWidget {
  const AddUsernameScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Username')),
      body: const Center(
        child: Text('Add your username here'),
      ),
    );
  }
}
