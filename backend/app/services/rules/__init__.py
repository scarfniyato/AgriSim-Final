"""
Expert System Rules Package

Two-Layer Architecture:
  Layer 1: Explanation Rules (layer1_rules.py) - WHY did growth change?
  Layer 2: Recommendation Rules (layer2_rules.py) - WHAT should the farmer do?

This structure follows the expert system design from the thesis document,
where Layer 1 provides diagnostic explanations based on stress factors,
and Layer 2 provides actionable management recommendations.
"""

from .layer1_rules import LAYER1_RULES
from .layer2_rules import LAYER2_RULES

__all__ = ['LAYER1_RULES', 'LAYER2_RULES']
