<?php

namespace App\Http\Responses;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

class ApiResponse
{
    /**
     * Standard Success Response (200 / Custom status)
     */
    public static function success(mixed $data = null, ?string $message = null, mixed $meta = null, int $statusCode = 200): JsonResponse
    {
        $requestId = request()->header('X-Request-ID') ?? request()->attributes->get('request_id');

        $payload = [
            'success' => true,
            'data' => $data,
            'message' => $message,
            'meta' => $meta,
        ];

        $response = response()->json($payload, $statusCode);

        if ($requestId) {
            $response->header('X-Request-ID', $requestId);
        }

        return $response;
    }

    /**
     * Standard Resource Created Response (201)
     */
    public static function created(mixed $data, ?string $message = 'Data berhasil disimpan.'): JsonResponse
    {
        return self::success($data, $message, null, 201);
    }

    /**
     * Standard Paginated List Response
     */
    public static function paginated(LengthAwarePaginator $paginator, ?string $message = null): JsonResponse
    {
        $meta = [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ]
        ];

        return self::success($paginator->items(), $message, $meta, 200);
    }

    /**
     * Standard Error Response
     */
    public static function error(
        string $code,
        string $message,
        mixed $details = null,
        int $statusCode = 400
    ): JsonResponse {
        $requestId = request()->header('X-Request-ID') ?? request()->attributes->get('request_id');

        $errorPayload = [
            'code' => $code,
            'message' => $message,
            'details' => $details,
            'request_id' => $requestId,
        ];

        $payload = [
            'success' => false,
            'error' => $errorPayload,
        ];

        $response = response()->json($payload, $statusCode);

        if ($requestId) {
            $response->header('X-Request-ID', $requestId);
        }

        return $response;
    }

    /**
     * Standard 422 Validation Error Response
     */
    public static function validationError(array $fieldErrors, ?string $message = 'Data yang diberikan tidak valid.'): JsonResponse
    {
        return self::error(
            'VALIDATION_ERROR',
            $message,
            ['fields' => $fieldErrors],
            422
        );
    }
}
