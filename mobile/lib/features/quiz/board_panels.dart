import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import 'board_provider.dart';

/// The web Sidebar: "Live Scoreboard" with the Score / Streak / Accuracy tiles and Recent History.
class ScoreboardPanel extends StatelessWidget {
  const ScoreboardPanel({super.key, required this.board});

  final Board board;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            '📊  Live Scoreboard',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 0.5),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _StatTile(
                icon: Icons.emoji_events_outlined,
                iconColor: AppColors.cryptoGold,
                label: 'SCORE',
                value: '${board.score}',
                valueColor: Colors.white,
                caption: 'pts',
              ),
              const SizedBox(width: 10),
              _StatTile(
                icon: Icons.local_fire_department_outlined,
                iconColor: AppColors.popCoral,
                label: 'STREAK',
                value: '${board.streak}',
                valueColor: AppColors.cryptoGold,
                caption: 'Best: ${board.bestStreak}',
                hot: board.streak >= 3,
              ),
              const SizedBox(width: 10),
              _StatTile(
                icon: Icons.gps_fixed,
                iconColor: AppColors.neoMint,
                label: 'ACCURACY',
                value: '${board.accuracy}%',
                valueColor: AppColors.neoMint,
                caption: '${board.totalAnswered} total',
              ),
            ],
          ),
          const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Divider(height: 1, color: AppColors.cyberBorder)),
          _HistoryList(history: board.history),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.valueColor,
    required this.caption,
    this.hot = false,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final Color valueColor;
  final String caption;
  final bool hot;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.elevation2,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: hot ? AppColors.popCoral : Colors.transparent),
        ),
        child: Column(
          children: [
            Icon(icon, size: 16, color: iconColor),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1, color: AppColors.slate400),
            ),
            Text(
              value,
              style: TextStyle(fontFamily: headingFont, fontSize: 20, fontWeight: FontWeight.w900, color: valueColor),
            ),
            Text(
              caption,
              maxLines: 1,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: AppColors.slate500),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistoryList extends StatelessWidget {
  const _HistoryList({required this.history});

  final List<Map<String, dynamic>> history;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Row(
          children: [
            Icon(Icons.history, size: 14, color: AppColors.slate400),
            SizedBox(width: 6),
            Text(
              'RECENT HISTORY',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1, color: AppColors.slate300),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (history.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'No answered questions yet.',
              style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.slate500),
            ),
          )
        else
          for (final item in history.take(6))
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: _HistoryRow(prompt: item['prompt'] as String, isCorrect: item['isCorrect'] as bool),
            ),
      ],
    );
  }
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.prompt, required this.isCorrect});

  final String prompt;
  final bool isCorrect;

  @override
  Widget build(BuildContext context) {
    final color = isCorrect ? AppColors.neoMint : AppColors.popCoral;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.elevation2, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Expanded(
            child: Text(
              prompt,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.slate300),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              border: Border.all(color: color.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(isCorrect ? Icons.check : Icons.close, size: 10, color: color),
                const SizedBox(width: 3),
                Text(
                  isCorrect ? 'PASS' : 'FAIL',
                  style: TextStyle(fontFamily: headingFont, fontSize: 10, fontWeight: FontWeight.bold, color: color),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The web LeaderboardPanel's "Global Top" tab, five rows a page. The Group Guild tab is
/// left out: groups have no mobile API yet.
class LeaderboardPanel extends StatefulWidget {
  const LeaderboardPanel({super.key, required this.entries, required this.loading});

  final List<Map<String, dynamic>> entries;
  final bool loading;

  @override
  State<LeaderboardPanel> createState() => _LeaderboardPanelState();
}

class _LeaderboardPanelState extends State<LeaderboardPanel> {
  static const _pageSize = 5;
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final entries = widget.entries;
    final pages = (entries.length / _pageSize).ceil();
    final page = _page.clamp(0, pages == 0 ? 0 : pages - 1);
    final shown = entries.skip(page * _pageSize).take(_pageSize).toList();

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.only(bottom: 12),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.cyberBorder))),
            child: Container(
              padding: const EdgeInsets.only(bottom: 6),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.cryptoGold, width: 2))),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.emoji_events_outlined, size: 14, color: AppColors.cryptoGold),
                  SizedBox(width: 6),
                  Text(
                    'Global Top',
                    style: TextStyle(fontFamily: headingFont, fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.cryptoGold),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (widget.loading)
            const _LeaderboardNote(text: 'Loading leaderboard...')
          else if (entries.isEmpty)
            const _LeaderboardNote(text: 'No records yet. Complete a quiz to rank!', italic: true)
          else ...[
            ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 260),
              child: Column(
                children: [
                  for (var i = 0; i < shown.length; i++)
                    Padding(padding: const EdgeInsets.only(bottom: 8), child: _LeaderboardRow(entry: shown[i], index: i)),
                ],
              ),
            ),
            if (pages > 1) ...[
              const Divider(height: 24, color: AppColors.cyberBorder),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _PageButton(icon: Icons.chevron_left, label: 'Prev', onTap: page > 0 ? () => setState(() => _page = page - 1) : null),
                  Text(
                    'Page ${page + 1} of $pages',
                    style: const TextStyle(fontFamily: headingFont, fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.slate400),
                  ),
                  _PageButton(
                    icon: Icons.chevron_right,
                    label: 'Next',
                    trailing: true,
                    onTap: page < pages - 1 ? () => setState(() => _page = page + 1) : null,
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _LeaderboardNote extends StatelessWidget {
  const _LeaderboardNote({required this.text, this.italic = false});

  final String text;
  final bool italic;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12, color: AppColors.slate500, fontStyle: italic ? FontStyle.italic : FontStyle.normal),
      ),
    );
  }
}

class _LeaderboardRow extends StatelessWidget {
  const _LeaderboardRow({required this.entry, required this.index});

  final Map<String, dynamic> entry;
  final int index;

  String get _name {
    final display = entry['display_name'] as String?;
    if (display != null && display.isNotEmpty) return display;
    final wallet = entry['wallet_address'] as String?;
    if (wallet != null && wallet.isNotEmpty) return wallet.substring(0, wallet.length < 10 ? wallet.length : 10);
    return 'Player';
  }

  Widget _rank(int rank) {
    if (rank == 1) return const Icon(Icons.emoji_events, size: 16, color: AppColors.cryptoGold);
    if (rank == 2) return const Icon(Icons.workspace_premium, size: 16, color: AppColors.slate300);
    if (rank == 3) return const Icon(Icons.workspace_premium, size: 16, color: Color(0xFFFF8A65));
    return Text('#$rank', style: const TextStyle(fontFamily: headingFont, fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400));
  }

  @override
  Widget build(BuildContext context) {
    final rank = entry['rank'] as int;
    final topThree = rank <= 3;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: topThree ? Colors.transparent : AppColors.cyberBorder),
        color: topThree ? null : (index.isEven ? AppColors.deepSpace : AppColors.elevation2),
        gradient: topThree
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.cryptoGold.withValues(alpha: 0.2), AppColors.popCoral.withValues(alpha: 0.2)],
              )
            : null,
      ),
      child: Row(
        children: [
          SizedBox(width: 28, child: Center(child: _rank(rank))),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              _name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: rank == 1 ? AppColors.cryptoGold : AppColors.slate200,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text('${entry['accuracy']}% acc', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.slate400)),
          const SizedBox(width: 12),
          Text(
            '${entry['score']} pts',
            style: const TextStyle(fontFamily: headingFont, fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.neoMint),
          ),
        ],
      ),
    );
  }
}

class _PageButton extends StatelessWidget {
  const _PageButton({required this.icon, required this.label, required this.onTap, this.trailing = false});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool trailing;

  @override
  Widget build(BuildContext context) {
    final children = [
      Icon(icon, size: 14, color: AppColors.slate300),
      Text(label, style: const TextStyle(fontSize: 12, color: AppColors.slate300)),
    ];
    return Opacity(
      opacity: onTap == null ? 0.4 : 1,
      child: Material(
        color: AppColors.cyberVioletLight,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Row(mainAxisSize: MainAxisSize.min, children: trailing ? children.reversed.toList() : children),
          ),
        ),
      ),
    );
  }
}
