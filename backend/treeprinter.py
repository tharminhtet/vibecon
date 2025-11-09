def print_tree(rows):
    """
    Convert flat query results into a proper tree structure.

    Args:
        rows: List of dicts from Supabase with 'id', 'name' and 'depth' fields

    Returns:
        str: A formatted tree structure as a string
    """
    if not rows:
        return ""

    # Track which depths still have more children coming
    active_depths = set()
    lines = []

    for i, row in enumerate(rows):
        depth = row["depth"]
        name = row["name"]
        node_id = row["id"]

        # Root node
        if depth == 0:
            lines.append(f"{name} ({node_id})")
            continue

        # Build the prefix with proper vertical lines
        prefix = ""
        for d in range(1, depth):
            if d in active_depths:
                prefix += "│   "
            else:
                prefix += "    "

        # Check if there are more siblings at this depth
        has_more_siblings = False
        for j in range(i + 1, len(rows)):
            if rows[j]["depth"] < depth:
                break
            if rows[j]["depth"] == depth:
                has_more_siblings = True
                break

        # Update active depths
        if has_more_siblings:
            active_depths.add(depth)
            connector = "├── "
        else:
            active_depths.discard(depth)
            connector = "└── "

        lines.append(f"{prefix}{connector}{name} ({node_id})")

    return "\n".join(lines)