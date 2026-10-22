import 'package:flutter/material.dart';

/// Helper for responsive scaling based on a reference screen width.
/// Reference width is 375.0 (typical mobile design width).
class Responsive {
  final BuildContext context;
  Responsive(this.context);

  double get _width => MediaQuery.of(context).size.width;
  double get _height => MediaQuery.of(context).size.height;

  /// Scale a dimension (e.g., width, height, padding) proportionally.
  double scale(double size) => size * _width / 375.0;

  /// Scale text size.
  double textScale(double size) => size * _width / 375.0;
}
