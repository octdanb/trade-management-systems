from unittest import mock

from django.test import SimpleTestCase

from core.services import routing


class OptimizeOrderTests(SimpleTestCase):
    def test_single_point(self):
        self.assertEqual(routing.optimize_order([[0.0]]), [0])

    def test_points_on_a_line(self):
        # Offsets 0, 1, 5, 6 km along a line; optimal open path is in order.
        coords = [(0.0, 0.0), (0.0, 0.009), (0.0, 0.045), (0.0, 0.054)]
        matrix = routing.haversine_matrix(coords)
        self.assertEqual(routing.optimize_order(matrix), [0, 1, 2, 3])

    def test_two_opt_fixes_nearest_neighbor_zigzag(self):
        # Known matrix where greedy NN from 0 is suboptimal: 0 -> 1 (1) -> 3 (5)
        # -> 2 (2) total 8, but 0 -> 1 -> 2 -> 3 costs 1 + 4 + 2 = 7.
        matrix = [
            [0, 1, 6, 9],
            [1, 0, 4, 5],
            [6, 4, 0, 2],
            [9, 5, 2, 0],
        ]
        order = routing.optimize_order(matrix)
        total = sum(routing.path_leg_durations(matrix, order))
        self.assertEqual(order, [0, 1, 2, 3])
        self.assertEqual(total, 7)

    def test_start_index_stays_first(self):
        matrix = routing.haversine_matrix([(0.0, 0.03), (0.0, 0.0), (0.0, 0.06)])
        order = routing.optimize_order(matrix, start=0)
        self.assertEqual(order[0], 0)


class DurationMatrixTests(SimpleTestCase):
    def test_falls_back_to_haversine_when_osrm_unreachable(self):
        coords = [(-41.31, 174.78), (-41.29, 174.78)]
        with mock.patch.object(routing.httpx, "get", side_effect=OSError("no network")):
            matrix, used_fallback = routing.duration_matrix(coords)
        self.assertTrue(used_fallback)
        self.assertEqual(matrix[0][0], 0.0)
        self.assertGreater(matrix[0][1], 0.0)

    def test_patches_null_durations_from_osrm(self):
        coords = [(-41.31, 174.78), (-41.29, 174.78)]
        response = mock.Mock()
        response.json.return_value = {"code": "Ok", "durations": [[0, None], [120, 0]]}
        response.raise_for_status.return_value = None
        with mock.patch.object(routing.httpx, "get", return_value=response):
            matrix, used_fallback = routing.duration_matrix(coords)
        self.assertFalse(used_fallback)
        self.assertGreater(matrix[0][1], 0.0)
        self.assertEqual(matrix[1][0], 120)

    def test_single_coord_needs_no_request(self):
        matrix, used_fallback = routing.duration_matrix([(-41.31, 174.78)])
        self.assertEqual(matrix, [[0.0]])
        self.assertFalse(used_fallback)
