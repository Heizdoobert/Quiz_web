import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// The web's `.glass .glass-border`: translucent surface with a mint-to-indigo hairline.
class GlassCard extends StatelessWidget {
  const GlassCard({super.key, required this.child, this.padding = const EdgeInsets.all(20), this.radius = 24});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.neoMint.withValues(alpha: 0.4),
            AppColors.electricIndigo.withValues(alpha: 0.4),
          ],
        ),
        boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 24, offset: Offset(0, 12))],
      ),
      padding: const EdgeInsets.all(1),
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(radius - 1),
          color: const Color(0xFF14163A).withValues(alpha: 0.92),
        ),
        child: child,
      ),
    );
  }
}

/// The web's primary action: gradient pill with deep-space text.
class GradientButton extends StatelessWidget {
  const GradientButton({super.key, required this.label, required this.onPressed, this.icon, this.loading = false});

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: Material(
        color: Colors.transparent,
        child: Ink(
          decoration: BoxDecoration(gradient: brandGradient, borderRadius: BorderRadius.circular(14)),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: enabled ? onPressed : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (loading)
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.deepSpace),
                    )
                  else if (icon != null)
                    Icon(icon, size: 18, color: AppColors.deepSpace),
                  if (loading || icon != null) const SizedBox(width: 8),
                  Text(
                    label,
                    style: const TextStyle(
                      fontFamily: headingFont,
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      color: AppColors.deepSpace,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
